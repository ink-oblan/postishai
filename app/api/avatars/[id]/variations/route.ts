import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { enqueueAvatarVariationGenerateJob, enqueueJobInDb } from "@/lib/worker/jobs";
import { renderAvatarVariationPrompt } from "@/lib/avatar-variation-prompt";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId }
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variations = await prisma.avatarVariation.findMany({
    where: { avatarId: id, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(variations);
});

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId }
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { label, clothes, background, pose, imageModel } = body as {
    label?: string;
    clothes?: string;
    background?: string;
    pose?: string;
    imageModel?: string;
  };

  if (!label?.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const usedModel = imageModel ?? avatar.imageModel ?? DEFAULT_IMAGE_MODEL_ID;
  const prompt = await renderAvatarVariationPrompt({
    clothes: clothes?.trim() || undefined,
    background: background?.trim() || undefined,
    pose: pose?.trim() || undefined,
  }, !avatar.prompt);

  const variation = await prisma.$transaction(async (tx) => {
    const created = await tx.avatarVariation.create({
      data: {
        avatarId: id,
        label: label.trim(),
        clothes: clothes?.trim() ?? null,
        background: background?.trim() ?? null,
        pose: pose?.trim() ?? null,
        prompt,
        imageModel: usedModel,
        status: "PENDING",
      },
    });

    await enqueueJobInDb(tx, "avatar.variation.generate", {
      variationId: created.id,
      prompt,
      imageModel: usedModel,
    });

    return created;
  });

  return NextResponse.json(variation, { status: 202 });
});
