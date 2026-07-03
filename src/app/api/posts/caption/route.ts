import { randomBytes, randomUUID } from "node:crypto";
import { readFile, unlink, writeFile as writeFileFs } from "node:fs/promises";
import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { runFfmpeg } from "@/lib/ffmpeg";
import { writeFile } from "@/lib/storage";
import { PLATFORM_LABELS } from "@/lib/utils";

const VALID_PLATFORMS = new Set(Object.keys(PLATFORM_LABELS));

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

async function cropVideo(
  buffer: Buffer,
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/caption_crop_in_${id}.mp4`;
  const tmpOut = `/tmp/caption_crop_out_${id}.mp4`;
  try {
    await writeFileFs(tmpIn, buffer);
    const ratio = `${targetWidth}/${targetHeight}`;
    await runFfmpeg([
      "-i",
      tmpIn,
      "-vf",
      `crop='if(gt(iw/ih,${ratio}),ih*${ratio},iw)':'if(gt(iw/ih,${ratio}),ih,iw*${targetHeight}/${targetWidth})':(iw-out_w)/2:(ih-out_h)/2`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-c:a",
      "copy",
      "-y",
      tmpOut,
    ]);
    return await readFile(tmpOut);
  } finally {
    await Promise.all([unlink(tmpIn).catch(() => {}), unlink(tmpOut).catch(() => {})]);
  }
}

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const formData = await req.formData();
  const title = formData.get("title")?.toString();
  const platform = formData.get("platform")?.toString();
  const caption = formData.get("caption")?.toString();
  const media = formData.getAll("media").filter((v): v is File => v instanceof File);

  const trimmedTitle = title?.trim();
  const trimmedCaption = caption?.trim();

  if (!trimmedTitle || !platform || !trimmedCaption) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  const postId = randomUUID();

  const prepared = await Promise.all(
    media.map(async (file, i) => {
      const isVideo = file.type.startsWith("video/");
      let buffer: Buffer = Buffer.from(await file.arrayBuffer());
      const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";
      if (isVideo) {
        const [targetW, targetH] = media.length === 1 ? [9, 16] : [4, 5];
        buffer = await cropVideo(buffer, targetW, targetH);
      }
      const path = `posts/${postId}/${i}.${ext}`;
      await writeFile(path, buffer);
      return { path, isVideo, order: i };
    }),
  );

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        id: postId,
        type: "CAPTION",
        title: trimmedTitle,
        platform: platform as Platform,
        caption: trimmedCaption,
        status: "COMPLETED",
        userId,
      },
    });

    await Promise.all(
      prepared.map(({ path, isVideo, order }) =>
        tx.postMedia.create({
          data: {
            postId: created.id,
            type: isVideo ? "VIDEO" : "IMAGE",
            path,
            order,
          },
        }),
      ),
    );

    return created;
  });

  return NextResponse.json(post, { status: 201 });
});
