import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile as writeFileFs } from "node:fs/promises";
import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { convertAndCropToJpeg } from "@/lib/image-convert";
import { writeFile } from "@/lib/storage";
import { PLATFORM_LABELS } from "@/lib/utils";

const VALID_PLATFORMS = new Set(Object.keys(PLATFORM_LABELS));

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function cropVideoTo916(buffer: Buffer): Promise<Buffer> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/caption_crop_in_${id}.mp4`;
  const tmpOut = `/tmp/caption_crop_out_${id}.mp4`;
  try {
    await writeFileFs(tmpIn, buffer);
    // Center-crop to 9:16: derive crop dimensions from whichever axis fits.
    // ffmpeg crop filter: crop=w:h:x:y where x/y are top-left offsets.
    // Using named variables so ffmpeg computes at runtime from actual stream size.
    await runFfmpeg([
      "-i",
      tmpIn,
      "-vf",
      "crop='if(gt(iw/ih,9/16),ih*9/16,iw)':'if(gt(iw/ih,9/16),ih,iw*16/9)':(iw-out_w)/2:(ih-out_h)/2",
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

  const post = await prisma.post.create({
    data: {
      type: "CAPTION",
      title: trimmedTitle,
      platform: platform as Platform,
      caption: trimmedCaption,
      status: "COMPLETED",
      userId,
    },
  });

  for (let i = 0; i < media.length; i++) {
    const file = media[i];
    const isVideo = file.type.startsWith("video/");
    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";

    if (isVideo) {
      buffer = await cropVideoTo916(buffer);
    } else {
      buffer = await convertAndCropToJpeg(buffer, 4, 5);
    }

    const path = `posts/${post.id}/${i}.${ext}`;
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

  return NextResponse.json(post, { status: 201 });
});
