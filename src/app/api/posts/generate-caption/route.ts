import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { writeFile } from "@/lib/storage";
import { enqueuePostCaptionGenerateJob } from "@/lib/worker/jobs";

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const POST = withAuth(async function POST(req: NextRequest, _ctx, { userId }) {
  const formData = await req.formData();
  const title = formData.get("title")?.toString();
  const platform = formData.get("platform")?.toString();
  const llmModelId = formData.get("llmModelId")?.toString();
  const media = formData.getAll("media").filter((v): v is File => v instanceof File);

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!llmModelId) {
    return NextResponse.json({ error: "llmModelId is required" }, { status: 400 });
  }

  if (media.length === 0) {
    return NextResponse.json({ error: "At least one media file is required" }, { status: 400 });
  }

  try {
    // Create post record - worker will set status to GENERATING when enqueueing
    const post = await prisma.post.create({
      data: {
        type: "CAPTION",
        title: title.trim(),
        platform: (platform as Platform) || "INSTAGRAM",
        caption: null,
        status: "DRAFT",
        userId,
        llmModelId,
      },
    });

    // Save media files and create media records (outside transaction to avoid timeout)
    for (let i = 0; i < media.length; i++) {
      const file = media[i];
      const isVideo = file.type.startsWith("video/");
      const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";
      const path = `posts/${post.id}/${i}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path, buffer);

      await prisma.postMedia.create({
        data: {
          postId: post.id,
          type: isVideo ? "VIDEO" : "IMAGE",
          path,
          order: i,
        },
      });
    }

    // Enqueue caption generation job
    await enqueuePostCaptionGenerateJob({ postId: post.id });

    return NextResponse.json({
      postId: post.id,
      post: {
        id: post.id,
        title: post.title,
        platform: post.platform,
        caption: post.caption,
        status: post.status,
        media: await prisma.postMedia.findMany({
          where: { postId: post.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  } catch (err) {
    console.error("Caption generation job enqueue failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start caption generation" },
      { status: 500 },
    );
  }
});
