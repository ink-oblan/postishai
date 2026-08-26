import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import {
  BRAND_ASSET_CONTENT_TYPES,
  fileExtension,
  resolveOwnBrandAssetPath,
} from "@/lib/brand-assets";
import { readFile } from "@/lib/storage";

export const GET = withAuth(async function GET(request: NextRequest, _context, { userId }) {
  const rawPath = request.nextUrl.searchParams.get("path");

  if (!rawPath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Resolves `..` before comparing the owner segment, so a caller cannot walk out of
  // their own directory into somebody else's brand assets.
  const filePath = resolveOwnBrandAssetPath(rawPath, userId);
  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        BRAND_ASSET_CONTENT_TYPES[fileExtension(filePath)] ?? "application/octet-stream",
      // Per-user asset — must not be stored by shared caches.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
