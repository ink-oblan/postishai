import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { convertToJpeg } from "@/lib/image-convert";
import { writeFile } from "@/lib/storage";

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const formData = await req.formData();
  const title = formData.get("title")?.toString();
  const platform = formData.get("platform")?.toString() as Platform | undefined;
  const caption = formData.get("caption")?.toString();
  const media = formData.getAll("media").filter((v): v is File => v instanceof File);

  const trimmedTitle = title?.trim();
  const trimmedCaption = caption?.trim();

  if (!trimmedTitle || !platform || !trimmedCaption) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      type: "CAPTION",
      title: trimmedTitle,
      platform,
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

    if (!isVideo) {
      buffer = await convertToJpeg(buffer);
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
