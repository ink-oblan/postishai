import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { generateAvatarVariationLabel } from "@/lib/avatar-variation-label";
import { renderAvatarVariationPrompt } from "@/lib/avatar-variation-prompt";
import { VARIATION_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { enqueueJobInDb } from "@/lib/worker/jobs";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
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
  { userId },
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { label, clothes, background, pose, imageModel, sourceVariationId, replaceVariationId } =
    body as {
      label?: string;
      clothes?: string;
      background?: string;
      pose?: string;
      imageModel?: string;
      sourceVariationId?: string;
      replaceVariationId?: string;
    };
  const trimmedClothes = clothes?.trim() || undefined;
  const trimmedBackground = background?.trim() || undefined;
  const trimmedPose = pose?.trim() || undefined;
  const trimmedSourceVariationId = sourceVariationId?.trim() || undefined;
  const trimmedReplaceVariationId = replaceVariationId?.trim() || undefined;
  const resolvedLabel =
    label?.trim() ||
    generateAvatarVariationLabel({
      clothes: trimmedClothes,
      background: trimmedBackground,
      pose: trimmedPose,
    });

  const sourceVariation = trimmedSourceVariationId
    ? await prisma.avatarVariation.findFirst({
        where: {
          id: trimmedSourceVariationId,
          avatarId: id,
          archivedAt: null,
          status: VARIATION_STATUS.COMPLETED,
        },
      })
    : null;
  if (trimmedSourceVariationId && !sourceVariation) {
    return NextResponse.json({ error: "Invalid source variation" }, { status: 400 });
  }

  const replaceVariation = trimmedReplaceVariationId
    ? await prisma.avatarVariation.findFirst({
        where: {
          id: trimmedReplaceVariationId,
          avatarId: id,
          archivedAt: null,
          status: VARIATION_STATUS.COMPLETED,
        },
      })
    : null;
  if (trimmedReplaceVariationId && !replaceVariation) {
    return NextResponse.json({ error: "Invalid variation to update" }, { status: 400 });
  }

  const usedModel = imageModel ?? avatar.imageModel ?? DEFAULT_IMAGE_MODEL_ID;
  const prompt = await renderAvatarVariationPrompt(
    {
      clothes: trimmedClothes,
      background: trimmedBackground,
      pose: trimmedPose,
    },
    !avatar.prompt,
  );

  const variation = await prisma.$transaction(async (tx) => {
    const created = await tx.avatarVariation.create({
      data: {
        avatarId: id,
        label: resolvedLabel,
        clothes: trimmedClothes ?? null,
        background: trimmedBackground ?? null,
        pose: trimmedPose ?? null,
        prompt,
        imageModel: usedModel,
        status: VARIATION_STATUS.PENDING,
      },
    });

    await enqueueJobInDb(tx, "avatar.variation.generate", {
      variationId: created.id,
      prompt,
      imageModel: usedModel,
      sourceImagePath: sourceVariation?.imagePath,
    });

    if (replaceVariation) {
      await tx.avatarVariation.update({
        where: { id: replaceVariation.id },
        data: { archivedAt: new Date() },
      });
    }

    return created;
  });

  return NextResponse.json(variation, { status: 202 });
});
