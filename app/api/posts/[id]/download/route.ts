import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { metadataToText } from "@/lib/metadata/generator";
import type { PlatformMetadata } from "@/lib/metadata/types";
import archiver from "archiver";
import { Readable } from "stream";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId }
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status !== "COMPLETED" || !post.videoPath) {
    return NextResponse.json({ error: "Video not ready" }, { status: 409 });
  }

  const videoBuffer = await readFile(post.videoPath);
  const metadata: PlatformMetadata = JSON.parse(post.metadata ?? "{}");
  const metadataText = metadataToText(metadata);

  const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const platform = post.platform.toLowerCase().replace("_", "-");
  const filename = `${slug}-${platform}.zip`;

  // Build ZIP in memory
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.append(videoBuffer, { name: "video.mp4" });
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
