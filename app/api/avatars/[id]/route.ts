import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { renderAvatarPrompt } from "@/lib/avatar-prompt";
import { prisma } from "@/lib/db";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { deleteFile, writeFile } from "@/lib/storage";
import { enqueueJobInDb } from "@/lib/worker/jobs";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({
    where: { id, userId },
    include: { posts: { orderBy: { createdAt: "desc" } } },
  });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(avatar);
});

export const PATCH = withAuth(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const body = await req.json();
  const {
    name,
    voiceId,
    prompt,
    gender,
    age,
    ethnicity,
    origin,
    occupation,
    imageModel,
    regenerate,
    imageBase64,
    archive,
  } = body as {
    name?: string;
    voiceId?: string;
    prompt?: string;
    gender?: "man" | "woman" | "neutral";
    age?: number;
    ethnicity?: string;
    origin?: string;
    occupation?: string;
    imageModel?: string;
    regenerate?: boolean;
    imageBase64?: string;
    archive?: boolean;
  };

  if (archive) {
    const existing = await prisma.avatar.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.avatar.update({ where: { id }, data: { archivedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  }

  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (voiceId) updateData.voiceId = voiceId;

  if (regenerate || imageBase64) {
    if (imageBase64) {
      // Upload: process synchronously
      const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const mimeType: "image/png" | "image/jpeg" = imageBase64.startsWith("data:image/jpeg")
        ? "image/jpeg"
        : "image/png";

      if (avatar.imagePath && avatar.imagePath !== "") await deleteFile(avatar.imagePath);

      const ext = mimeType === "image/jpeg" ? "jpg" : "png";
      const relativePath = `avatars/${id}.${ext}`;
      await writeFile(relativePath, Buffer.from(base64, "base64"));

      updateData.imagePath = relativePath;
      updateData.imageModel = null;
      updateData.status = "COMPLETED";
      updateData.heygenAssetId = null;
      updateData.heygenAssetUrl = null;
      if (prompt) updateData.prompt = prompt;
    } else {
      // AI regeneration: enqueue job
      const usedModel = imageModel ?? avatar.imageModel ?? DEFAULT_IMAGE_MODEL_ID;

      // Re-render prompt if structured fields provided, otherwise fall back to stored prompt
      let usedPrompt = avatar.prompt;
      if (gender && age && ethnicity && occupation) {
        usedPrompt = await renderAvatarPrompt({
          gender,
          age,
          ethnicity,
          origin,
          occupation,
        });
        updateData.gender = gender;
        updateData.age = age;
        updateData.ethnicity = ethnicity;
        updateData.origin = origin ?? null;
        updateData.occupation = occupation;
        updateData.prompt = usedPrompt;
      }

      if (!usedPrompt)
        return NextResponse.json({ error: "prompt required for regeneration" }, { status: 400 });

      updateData.status = "GENERATING";
      updateData.imageModel = usedModel;
      updateData.heygenAssetId = null;
      updateData.heygenAssetUrl = null;

      const refreshed = await prisma.$transaction(async (tx) => {
        await tx.avatar.update({ where: { id }, data: updateData });
        await enqueueJobInDb(tx, "avatar.generate", {
          avatarId: id,
          prompt: usedPrompt,
          imageModel: usedModel,
        });

        return tx.avatar.findUnique({ where: { id } });
      });
      return NextResponse.json(refreshed);
    }
  } else if (prompt) {
    updateData.prompt = prompt;
  }

  try {
    const updated = await prisma.avatar.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH avatar] update failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
