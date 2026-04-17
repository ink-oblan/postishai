import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueJobInDb } from "@/lib/worker/jobs";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";

type Params = { params: Promise<{ id: string; variationId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id, variationId } = await params;

  const variation = await prisma.avatarVariation.findFirst({
    where: { id: variationId, avatarId: id },
  });
  if (!variation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!variation.prompt) return NextResponse.json({ error: "Variation has no prompt to regenerate from" }, { status: 422 });

  const usedModel = variation.imageModel ?? DEFAULT_IMAGE_MODEL_ID;

  const updated = await prisma.$transaction(async (tx) => {
    const v = await tx.avatarVariation.update({
      where: { id: variationId },
      data: {
        status: "PENDING",
        errorMessage: null,
        heygenAssetId: null,
        heygenAssetUrl: null,
      },
    });

    await enqueueJobInDb(tx, "avatar.variation.generate", {
      variationId,
      prompt: variation.prompt!,
      imageModel: usedModel,
    });

    return v;
  });

  return NextResponse.json(updated, { status: 202 });
}
