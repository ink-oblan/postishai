import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { validateCaptionMedia } from "@/lib/caption-media-validation";
import { METADATA_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { debugLog } from "@/lib/debug";
import { convertToJpeg } from "@/lib/image-convert";
import { writeFile } from "@/lib/storage";
import { enqueueJobInDb, hasActiveJob } from "@/lib/worker/jobs";

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let media: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    media = formData.getAll("media").filter((v): v is File => v instanceof File);
  }

  const hasMedia = media.length > 0;
  const hasScript = !!post.script;

  debugLog(
    `[metadata/generate] postId=${id} hasMedia=${hasMedia} hasScript=${hasScript} platform=${post.platform}`,
  );

  if (!hasMedia && !hasScript) {
    return NextResponse.json(
      { error: "Post has no media and no script — cannot generate captions" },
      { status: 400 },
    );
  }

  if (hasMedia) {
    const mediaValidationError = validateCaptionMedia(media);
    if (mediaValidationError) {
      return NextResponse.json({ error: mediaValidationError.message }, { status: 400 });
    }
  }

  const mode = hasMedia ? "media" : "script";
  debugLog(
    `[metadata/generate] Using ${mode} mode. Fields sourced: title="${post.title}" platform=${post.platform} llmModelId=${post.llmModelId}`,
  );

  // Reject duplicate requests before mutating any media. Media must be persisted before the job
  // is enqueued (the worker can claim it immediately), so we can't lean on the enqueue transaction
  // to guard the media writes — check up front instead.
  if (await hasActiveJob("post.metadata.generate", { postId: id })) {
    return NextResponse.json({ error: "Caption generation already queued" }, { status: 409 });
  }

  // If media files were provided, persist them first (replace existing media for this post).
  if (hasMedia) {
    await prisma.postMedia.deleteMany({ where: { postId: id } });
    await Promise.all(
      media.map(async (file, i) => {
        const isVideo = file.type.startsWith("video/");
        const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";
        const path = `posts/${id}/${i}.${ext}`;
        let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
        if (!isVideo) buffer = await convertToJpeg(buffer);
        await writeFile(path, buffer);
        await prisma.postMedia.create({
          data: { postId: id, type: isVideo ? "VIDEO" : "IMAGE", path, order: i },
        });
      }),
    );
  }

  const queued = await prisma.$transaction(async (tx) => {
    const result = await enqueueJobInDb(tx, "post.metadata.generate", { postId: id });
    if (result.created) {
      await tx.post.update({
        where: { id },
        data: {
          metadata: Prisma.DbNull,
          metadataStatus: METADATA_STATUS.GENERATING,
          metadataErrorMessage: null,
        },
      });
    }
    return result;
  });

  if (!queued.created) {
    return NextResponse.json({ error: "Caption generation already queued" }, { status: 409 });
  }

  return NextResponse.json({ status: METADATA_STATUS.GENERATING }, { status: 202 });
});
