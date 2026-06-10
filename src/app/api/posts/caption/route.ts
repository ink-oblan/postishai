import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { writeFile } from "@/lib/storage";

interface MediaInput {
  type: "image" | "video";
  dataUrl: string;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid media data URL");
  return { mimeType: match[1], base64: match[2] };
}

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const { title, platform, caption, media } = (await req.json()) as {
    title: string;
    platform: Platform;
    caption: string;
    media?: MediaInput[];
  };

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

  const mediaItems = media ?? [];
  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const { mimeType, base64 } = parseDataUrl(item.dataUrl);
    const ext = EXTENSIONS[mimeType] ?? (item.type === "video" ? "mp4" : "jpg");
    const path = `posts/${post.id}/${i}.${ext}`;
    await writeFile(path, Buffer.from(base64, "base64"));
    await prisma.postMedia.create({
      data: {
        postId: post.id,
        type: item.type === "video" ? "VIDEO" : "IMAGE",
        path,
        order: i,
      },
    });
  }

  return NextResponse.json(post, { status: 201 });
});
