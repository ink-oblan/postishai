import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { BRAND_ASSET_CONTENT_TYPES, fileExtension } from "@/lib/brand-assets";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";

export const GET = withAuth(async function GET(request: NextRequest, _context, { userId }) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const asset = await prisma.brandAsset.findFirst({
    where: { id, userId },
    select: { storagePath: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(asset.storagePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        BRAND_ASSET_CONTENT_TYPES[fileExtension(asset.storagePath)] ?? "application/octet-stream",
      // Uploads are validated by extension only, never by magic bytes, so stop the browser
      // from second-guessing the type we declare.
      "X-Content-Type-Options": "nosniff",
      // Per-user asset — must not be stored by shared caches.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
