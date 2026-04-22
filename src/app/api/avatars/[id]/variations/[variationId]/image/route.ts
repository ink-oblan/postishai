import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string; variationId: string }> };

export const GET = withAuth(async function GET(_req: NextRequest, { params }: Params, { userId }) {
  const { id, variationId } = await params;

  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variation = await prisma.avatarVariation.findFirst({
    where: { id: variationId, avatarId: id },
  });
  if (!variation?.imagePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(variation.imagePath);
  const contentType = variation.imagePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
  const etag = `"${variation.updatedAt.getTime()}"`;

  if (_req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=0, must-revalidate",
      ETag: etag,
    },
  });
});
