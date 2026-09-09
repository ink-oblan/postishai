import { Readable } from "node:stream";
import archiver from "archiver";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { metadataToText } from "@/lib/metadata/generator";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { readFile } from "@/lib/storage";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCarousel = post.type === "CAROUSEL";
  if (isCarousel) {
    if (post.media.length === 0) {
      return NextResponse.json({ error: "Slides not ready" }, { status: 409 });
    }
  } else if (post.status !== POST_STATUS.COMPLETED || !post.videoPath) {
    return NextResponse.json({ error: "Video not ready" }, { status: 409 });
  }

  const metadataText = post.metadata
    ? metadataToText(post.metadata as unknown as PlatformMetadata)
    : "";

  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const platform = post.platform.toLowerCase().replace("_", "-");
  const filename = `${slug}-${platform}.zip`;

  // Build ZIP in memory
  const archive = archiver("zip", { zlib: { level: 6 } });

  if (isCarousel) {
    for (const [index, media] of post.media.entries()) {
      const buffer = await readFile(media.path);
      archive.append(buffer, { name: `${String(index + 1).padStart(2, "0")}.png` });
    }
  } else {
    archive.append(await readFile(post.videoPath as string), { name: "video.mp4" });
  }

  archive.append(Buffer.from(metadataText, "utf-8"), { name: "metadata.txt" });
  archive.finalize();

  const chunks: Buffer[] = [];
  for await (const chunk of Readable.from(archive)) {
    chunks.push(chunk as Buffer);
  }
  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBuffer.byteLength),
    },
  });
});
