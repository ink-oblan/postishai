import { type NextRequest, NextResponse } from "next/server";
import { broadcastAvatarStatusUpdate, SSE_STATUS } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { renderAvatarPrompt } from "@/lib/avatar-prompt";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { prisma } from "@/lib/db";
import { decodeAndConvertImageBase64 } from "@/lib/image-convert";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { archiveFile, writeFile } from "@/lib/storage";
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
    origin?: string;
    occupation?: string;
    imageModel?: string;
    regenerate?: boolean;
    imageBase64?: string;
    archive?: boolean;
  };

  if (archive) {
    const existing = await prisma.avatar.findFirst({
      where: { id, userId },
      include: { variations: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.imagePath) await archiveFile(existing.imagePath).catch(() => null);
    await Promise.all(
      existing.variations.map((variation) =>
        variation.imagePath ? archiveFile(variation.imagePath).catch(() => null) : null,
      ),
    );
    await prisma.avatar.update({ where: { id }, data: { archivedAt: new Date() } });
    // Broadcast avatar deletion to all connected clients
    try {
      await broadcastWithContext("avatar-archive", () =>
        broadcastAvatarStatusUpdate(userId, id, SSE_STATUS.ARCHIVED),
      );
    } catch (broadcastErr) {
      console.error(
        `[PATCH /api/avatars/:id] Archive broadcast failed for avatarId=${id}:`,
        broadcastErr,
      );
    }
    return new NextResponse(null, { status: 204 });
  }

  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (voiceId) updateData.voiceId = voiceId;

  if (regenerate || imageBase64) {
    if (imageBase64) {
      // Upload: process synchronously. Skip conversion if already JPEG.
      const buffer = await decodeAndConvertImageBase64(imageBase64);

      if (avatar.imagePath && avatar.imagePath !== "") await archiveFile(avatar.imagePath);

      const relativePath = `avatars/${id}.jpg`;
      await writeFile(relativePath, buffer);

      updateData.imagePath = relativePath;
      updateData.imageModel = null;
      updateData.status = "COMPLETED";
      updateData.heygenAssetId = null;
      updateData.heygenAssetUrl = null;
      if (prompt) updateData.prompt = prompt;
    } else {
      // AI regeneration: enqueue job
      if (avatar.source === "UPLOADED") {
        return NextResponse.json(
          { error: "Cannot regenerate an avatar created from a user upload" },
          { status: 400 },
        );
      }

      const usedModel = imageModel ?? avatar.imageModel ?? DEFAULT_IMAGE_MODEL_ID;

      // Re-render prompt if structured fields provided, otherwise fall back to stored prompt
      let usedPrompt = avatar.prompt;
      if (gender && age && origin && occupation) {
        usedPrompt = await renderAvatarPrompt({
          gender,
          age,
          origin,
          occupation,
        });
        updateData.gender = gender;
        updateData.age = age;
        updateData.origin = origin;
        updateData.occupation = occupation;
        updateData.prompt = usedPrompt;
      }

      if (!usedPrompt)
        return NextResponse.json({ error: "prompt required for regeneration" }, { status: 400 });

      updateData.status = "GENERATING";
      updateData.imageModel = usedModel;
      updateData.heygenAssetId = null;
      updateData.heygenAssetUrl = null;

      const variations = await prisma.avatarVariation.findMany({
        where: { avatarId: id, archivedAt: null },
      });
      await Promise.all(
        variations.map((v) => (v.imagePath ? archiveFile(v.imagePath).catch(() => null) : null)),
      );

      const refreshed = await prisma.$transaction(async (tx) => {
        await tx.avatar.update({ where: { id }, data: updateData });
        if (variations.length > 0) {
          await tx.avatarVariation.updateMany({
            where: { avatarId: id, archivedAt: null },
            data: { archivedAt: new Date() },
          });
        }
        await enqueueJobInDb(tx, "avatar.generate", {
          avatarId: id,
          prompt: usedPrompt,
          imageModel: usedModel,
        });

        return tx.avatar.findUnique({ where: { id } });
      });
      // Broadcast avatar regeneration to all connected clients
      try {
        await broadcastWithContext("avatar-regenerate", () =>
          broadcastAvatarStatusUpdate(userId, id, "GENERATING"),
        );
      } catch (broadcastErr) {
        console.error(
          `[PATCH /api/avatars/:id] Regenerate broadcast failed for avatarId=${id}:`,
          broadcastErr,
        );
      }
      return NextResponse.json(refreshed);
    }
  } else if (prompt) {
    updateData.prompt = prompt;
  }

  try {
    const updated = await prisma.avatar.update({ where: { id }, data: updateData });
    // Broadcast avatar update to all connected clients
    try {
      await broadcastWithContext("avatar-update", () =>
        broadcastAvatarStatusUpdate(userId, id, updated.status),
      );
    } catch (broadcastErr) {
      console.error(
        `[PATCH /api/avatars/:id] Update broadcast failed for avatarId=${id}:`,
        broadcastErr,
      );
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH avatar] update failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
});
