import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar?.imagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await readFile(avatar.imagePath);
  const contentType = avatar.imagePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
  const etag = `"${avatar.updatedAt.getTime()}"`;

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
