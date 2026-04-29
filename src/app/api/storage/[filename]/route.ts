import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getPresignedUrl, readFile } from "@/lib/storage";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
  { userId },
) {
  const { filename } = await params;
  // Only serve .mp4 files from the videos directory
  if (!filename.endsWith(".mp4")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const postId = filename.slice(0, -".mp4".length);
  const post = await prisma.post.findFirst({
    where: { id: postId, userId, videoPath: `videos/${filename}` },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (config.storageMode === "s3") {
    const url = await getPresignedUrl(`videos/${filename}`);
    return NextResponse.redirect(url);
  }

  const buffer = await readFile(`videos/${filename}`);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
