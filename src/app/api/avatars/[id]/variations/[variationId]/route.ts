import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string; variationId: string }> };

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

  await prisma.avatarVariation.update({
    where: { id: variationId },
    data: { archivedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
});
