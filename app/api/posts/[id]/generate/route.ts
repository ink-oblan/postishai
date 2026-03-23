import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { uploadAvatarImage, createVideo } from "@/lib/heygen/client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, include: { avatar: true } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "GENERATING") {
    return NextResponse.json({ error: "Video already generating" }, { status: 409 });
  }
  if (post.status === "COMPLETED") {
    return NextResponse.json({ error: "Video already completed" }, { status: 409 });
  }

  const avatar = post.avatar;

  // Upload avatar image to HeyGen if not already done
  let heygenAssetId = avatar.heygenAssetId;
  if (!heygenAssetId) {
    const imageBuffer = await readFile(avatar.imagePath);
    const mimeType = avatar.imagePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
    const { assetId, assetUrl } = await uploadAvatarImage(imageBuffer, mimeType);
    heygenAssetId = assetId;
    await prisma.avatar.update({
      where: { id: avatar.id },
      data: { heygenAssetId: assetId, heygenAssetUrl: assetUrl },
    });
  }

  // Submit video generation job
  const heygenVideoId = await createVideo({
    image_asset_id: heygenAssetId,
    script: post.script,
    voice_id: post.voiceId,
    title: post.title,
  });

  await prisma.post.update({
    where: { id },
    data: { status: "GENERATING", heygenVideoId, errorMessage: null },
  });

  return NextResponse.json({ status: "GENERATING", heygenVideoId });
}
