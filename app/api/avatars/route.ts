import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile } from "@/lib/storage";
import { getImageAdapter, DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";

export async function GET() {
  const avatars = await prisma.avatar.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json(avatars);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, prompt, imageModel, imageBase64 } = body as {
    name: string;
    prompt?: string;
    imageModel?: string;
    imageBase64?: string; // base64 PNG for manual upload
  };

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  let base64: string;
  let mimeType: "image/png" | "image/jpeg" = "image/png";
  let usedModel: string | null = null;

  if (imageBase64) {
    // Manual upload
    base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    if (imageBase64.startsWith("data:image/jpeg")) mimeType = "image/jpeg";
  } else {
    // AI generation
    if (!prompt) return NextResponse.json({ error: "prompt required for AI generation" }, { status: 400 });
    usedModel = imageModel ?? DEFAULT_IMAGE_MODEL_ID;
    const adapter = getImageAdapter(usedModel);
    try {
      const result = await adapter.generate({ prompt });
      base64 = result.base64;
      mimeType = result.mimeType;
    } catch (err) {
      console.error("[avatars] image generation failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Image generation failed: ${message}` }, { status: 500 });
    }
  }

  // Create DB record first to get the ID for the file path
  const avatar = await prisma.avatar.create({
    data: { name, prompt: prompt ?? null, imageModel: usedModel, imagePath: "placeholder" },
  });

  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const relativePath = `avatars/${avatar.id}.${ext}`;
  await writeFile(relativePath, Buffer.from(base64, "base64"));

  const updated = await prisma.avatar.update({
    where: { id: avatar.id },
    data: { imagePath: relativePath },
  });

  return NextResponse.json(updated, { status: 201 });
}
