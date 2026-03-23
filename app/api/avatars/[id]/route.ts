import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, deleteFile } from "@/lib/storage";
import { getImageAdapter, DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avatar = await prisma.avatar.findUnique({ where: { id }, include: { posts: { orderBy: { createdAt: "desc" } } } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(avatar);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, prompt, imageModel, regenerate, imageBase64 } = body as {
    name?: string;
    prompt?: string;
    imageModel?: string;
    regenerate?: boolean;
    imageBase64?: string;
  };

  const avatar = await prisma.avatar.findUnique({ where: { id } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;

  if (regenerate || imageBase64) {
    let base64: string;
    let mimeType: "image/png" | "image/jpeg" = "image/png";
    let usedModel: string | null = avatar.imageModel;

    if (imageBase64) {
      base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      if (imageBase64.startsWith("data:image/jpeg")) mimeType = "image/jpeg";
      usedModel = null;
    } else {
      const usedPrompt = prompt ?? avatar.prompt;
      if (!usedPrompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
      usedModel = imageModel ?? avatar.imageModel ?? DEFAULT_IMAGE_MODEL_ID;
      const adapter = getImageAdapter(usedModel);
      const result = await adapter.generate({ prompt: usedPrompt });
      base64 = result.base64;
      mimeType = result.mimeType;
    }

    // Delete old image
    if (avatar.imagePath && avatar.imagePath !== "placeholder") {
      await deleteFile(avatar.imagePath);
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const relativePath = `avatars/${id}.${ext}`;
    await writeFile(relativePath, Buffer.from(base64, "base64"));

    updateData.imagePath = relativePath;
    updateData.imageModel = usedModel;
    updateData.heygenAssetId = null;
    updateData.heygenAssetUrl = null;
    if (prompt) updateData.prompt = prompt;
  } else if (prompt) {
    updateData.prompt = prompt;
  }

  const updated = await prisma.avatar.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avatar = await prisma.avatar.findUnique({ where: { id }, include: { _count: { select: { posts: true } } } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (avatar._count.posts > 0) {
    return NextResponse.json({ error: "Cannot delete avatar with existing posts" }, { status: 409 });
  }
  if (avatar.imagePath && avatar.imagePath !== "placeholder") {
    await deleteFile(avatar.imagePath);
  }
  await prisma.avatar.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
