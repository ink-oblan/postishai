import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string; variationId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, variationId } = await params;

  const variation = await prisma.avatarVariation.findFirst({
    where: { id: variationId, avatarId: id },
  });
  if (!variation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.avatarVariation.update({
    where: { id: variationId },
    data: { archivedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}
