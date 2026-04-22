import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models/registry";
import { enqueueJobInDb } from "@/lib/worker/jobs";

type Params = { params: Promise<{ id: string; variationId: string }> };

export const POST = withAuth(async function POST(
  _req: NextRequest,
  { params }: Params,
  { userId },
) {
  const { id, variationId } = await params;

  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variation = await prisma.avatarVariation.findFirst({
    where: { id: variationId, avatarId: id },
  });
  if (!variation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!variation.prompt)
    return NextResponse.json(
      { error: "Variation has no prompt to regenerate from" },
      { status: 422 },
    );

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
      prompt: variation.prompt as string,
      imageModel: usedModel,
    });

    return v;
  });

  return NextResponse.json(updated, { status: 202 });
});
