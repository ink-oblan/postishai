import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getPresignedUrl, readFile } from "@/lib/storage";

function contentTypeFor(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".mp4")) return "video/mp4";
  return "image/jpeg";
}

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
  { userId },
) {
  const { id, mediaId } = await params;
  const media = await prisma.postMedia.findFirst({
    where: { id: mediaId, postId: id, post: { userId } },
  });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (config.storageMode === "s3") {
    const url = await getPresignedUrl(media.path);
    return NextResponse.redirect(url);
  }

  const buffer = await readFile(media.path);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFor(media.path),
      "Cache-Control": "public, max-age=3600",
    },
  });
});
