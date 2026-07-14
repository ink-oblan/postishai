import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { broadcastAvatarStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { renderAvatarPrompt } from "@/lib/avatar-prompt";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { prisma } from "@/lib/db";
import { decodeAndConvertImageBase64 } from "@/lib/image-convert";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { CONTENT_STATUS } from "@/lib/sse-constants";
import { writeFile } from "@/lib/storage";
import { enqueueJobInDb } from "@/lib/worker/jobs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const GET = withAuth(async function GET(_req: NextRequest, _ctx: unknown, { userId }) {
  const avatars = await prisma.avatar.findMany({
    where: { archivedAt: null, userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json(avatars);
});

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const body = await req.json();
  const { name, voiceId, gender, age, origin, occupation, imageModel, imageBase64, source } =
    body as {
      name: string;
      voiceId: string;
      gender?: "man" | "woman" | "neutral";
      age?: number;
      origin?: string;
      occupation?: string;
      imageModel?: string;
      imageBase64?: string;
      source: "UPLOADED" | "GENERATED";
    };

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!voiceId) return NextResponse.json({ error: "voiceId is required" }, { status: 400 });
  if (source !== "UPLOADED" && source !== "GENERATED")
    return NextResponse.json({ error: "source must be UPLOADED or GENERATED" }, { status: 400 });
  if (source === "UPLOADED" && !imageBase64)
    return NextResponse.json(
      { error: "imageBase64 is required for UPLOADED source" },
      { status: 400 },
    );

  if (imageBase64) {
    // Upload: write image synchronously, enqueue async analysis.
    const buffer = await decodeAndConvertImageBase64(imageBase64);

    const byteLength = buffer.length;
    if (byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Photo is too large (max 10 MB)" }, { status: 413 });
    }

    const avatarId = randomUUID();
    const relativePath = `avatars/${avatarId}.jpg`;
    await writeFile(relativePath, buffer);

    const created = await prisma.$transaction(async (tx) => {
      const next = await tx.avatar.create({
        data: {
          id: avatarId,
          name,
          voiceId,
          imageModel: null,
          imagePath: relativePath,
          status: CONTENT_STATUS.COMPLETED,
          source,
          userId,
        },
      });
      await enqueueJobInDb(tx, "avatar.analyze", { avatarId });
      return next;
    });

    try {
      await broadcastWithContext("avatar-upload", () =>
        broadcastAvatarStatusUpdate(userId, created.id, CONTENT_STATUS.COMPLETED),
      );
    } catch (broadcastErr) {
      console.error("[POST /api/avatars] Broadcast failed:", broadcastErr);
      // Don't fail - avatar was created successfully
    }
    return NextResponse.json(created, { status: 201 });
  } else {
    // AI generation: render prompt, enqueue job, return immediately
    if (!gender || !age || !origin || !occupation) {
      return NextResponse.json(
        { error: "gender, age, origin, and occupation are required for AI generation" },
        { status: 400 },
      );
    }

    const usedModel = imageModel ?? DEFAULT_IMAGE_MODEL_ID;
    const prompt = await renderAvatarPrompt({ gender, age, origin, occupation });

    const avatar = await prisma.$transaction(async (tx) => {
      const createdAvatar = await tx.avatar.create({
        data: {
          name,
          voiceId,
          prompt,
          gender,
          age,
          origin,
          occupation,
          imageModel: usedModel,
          imagePath: "",
          status: CONTENT_STATUS.GENERATING,
          source,
          userId,
        },
      });

      await enqueueJobInDb(tx, "avatar.generate", {
        avatarId: createdAvatar.id,
        prompt,
        imageModel: usedModel,
      });

      return createdAvatar;
    });

    try {
      await broadcastWithContext("avatar-create", () =>
        broadcastAvatarStatusUpdate(userId, avatar.id, CONTENT_STATUS.GENERATING),
      );
    } catch (broadcastErr) {
      console.error("[POST /api/avatars] Generate broadcast failed:", broadcastErr);
      // Don't fail - avatar was created and job enqueued successfully
    }
    return NextResponse.json(avatar, { status: 202 });
  }
});
