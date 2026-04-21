import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile } from "@/lib/storage";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { enqueueAvatarGenerateJob, enqueueJobInDb } from "@/lib/worker/jobs";
import { renderAvatarPrompt } from "@/lib/avatar-prompt";
import { withAuth } from "@/lib/auth/dal";

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
  const { name, voiceId, gender, age, ethnicity, origin, occupation, imageModel, imageBase64 } = body as {
    name: string;
    voiceId: string;
    gender?: "man" | "woman" | "neutral";
    age?: number;
    ethnicity?: string;
    origin?: string;
    occupation?: string;
    imageModel?: string;
    imageBase64?: string;
  };

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!voiceId) return NextResponse.json({ error: "voiceId is required" }, { status: 400 });

  if (imageBase64) {
    // Upload: process synchronously
    const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeType: "image/png" | "image/jpeg" = imageBase64.startsWith("data:image/jpeg")
      ? "image/jpeg"
      : "image/png";

    const avatar = await prisma.avatar.create({
      data: { name, voiceId, imageModel: null, imagePath: "", status: "COMPLETED", userId },
    });

    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const relativePath = `avatars/${avatar.id}.${ext}`;
    await writeFile(relativePath, Buffer.from(base64, "base64"));

    const updated = await prisma.avatar.update({
      where: { id: avatar.id },
      data: { imagePath: relativePath },
    });
    return NextResponse.json(updated, { status: 201 });
  } else {
    // AI generation: render prompt, enqueue job, return immediately
    if (!gender || !age || !ethnicity || !occupation) {
      return NextResponse.json(
        { error: "gender, age, ethnicity, and occupation are required for AI generation" },
        { status: 400 }
      );
    }

    const usedModel = imageModel ?? DEFAULT_IMAGE_MODEL_ID;
    const prompt = await renderAvatarPrompt({ gender, age, ethnicity, origin, occupation });

    const avatar = await prisma.$transaction(async (tx) => {
      const createdAvatar = await tx.avatar.create({
        data: {
          name,
          voiceId,
          prompt,
          gender,
          age,
          ethnicity,
          origin: origin ?? null,
          occupation,
          imageModel: usedModel,
          imagePath: "",
          status: "GENERATING",
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

    return NextResponse.json(avatar, { status: 202 });
  }
});
