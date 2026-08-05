import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getPresignedUrl, readFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
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
