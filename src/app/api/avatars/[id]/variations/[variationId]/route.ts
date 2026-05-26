import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { archiveFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string; variationId: string }> };

export const PATCH = withAuth(async function PATCH(
  req: NextRequest,
  { params }: Params,
  { userId },
) {
  const { id, variationId } = await params;

  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variation = await prisma.avatarVariation.findFirst({
    where: { id: variationId, avatarId: id, archivedAt: null },
  });
  if (!variation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { label?: string };
  const { label } = body;
  if (!label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 });

  const updated = await prisma.avatarVariation.update({
    where: { id: variationId },
    data: { label: label.trim() },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuth(async function DELETE(
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

  if (variation.imagePath) await archiveFile(variation.imagePath).catch(() => null);

  await prisma.avatarVariation.update({
    where: { id: variationId },
    data: { archivedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
});
