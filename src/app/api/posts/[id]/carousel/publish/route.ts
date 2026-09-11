import { type NextRequest, NextResponse } from "next/server";
import { broadcastPostStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { carouselCanvas, slideCountError } from "@/lib/carousel/platform-spec";
import { CAROUSEL_STAGE, METADATA_STATUS, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { debugLog } from "@/lib/debug";
import { archiveFile, writeFile } from "@/lib/storage";
import { enqueuePostMetadataGenerateJob } from "@/lib/worker/jobs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Width and height out of a PNG's IHDR chunk, which always follows the 8-byte signature.
 * The slides are rasterised in the browser, so this is the only place the server can check
 * that what arrived is actually the platform's canvas size.
 */
function pngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId, type: "CAROUSEL", archivedAt: null },
    include: { slides: { orderBy: { order: "asc" } }, media: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.carouselStage !== CAROUSEL_STAGE.EDITING) {
    return NextResponse.json({ error: "This carousel is not ready to complete" }, { status: 409 });
  }

  const formData = await req.formData();
  const files = formData.getAll("slides").filter((value): value is File => value instanceof File);

  if (files.length !== post.slides.length) {
    return NextResponse.json(
      { error: `Expected ${post.slides.length} slide images, received ${files.length}` },
      { status: 400 },
    );
  }

  const countError = slideCountError(post.platform, files.length);
  if (countError) return NextResponse.json({ error: countError }, { status: 400 });

  const canvas = carouselCanvas(post.platform);
  const buffers: Buffer[] = [];

  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const size = pngSize(buffer);

    if (!size) {
      return NextResponse.json({ error: `Slide ${index + 1} is not a PNG` }, { status: 400 });
    }
    if (size.width !== canvas.width || size.height !== canvas.height) {
      return NextResponse.json(
        {
          error: `Slide ${index + 1} is ${size.width}x${size.height}, expected ${canvas.width}x${canvas.height}`,
        },
        { status: 400 },
      );
    }

    buffers.push(buffer);
  }

  const paths = buffers.map((_, index) => `posts/${post.id}/carousel/${index + 1}.png`);
  await Promise.all(buffers.map((buffer, index) => writeFile(paths[index], buffer)));

  // Republishing replaces the previous export rather than appending a second copy of the post.
  await Promise.all(post.media.map((media) => archiveFile(media.path).catch(() => null)));

  await prisma.$transaction(async (tx) => {
    await tx.postMedia.deleteMany({ where: { postId: post.id } });
    await tx.postMedia.createMany({
      data: paths.map((path, order) => ({ postId: post.id, type: "IMAGE", path, order })),
    });
    await tx.post.update({
      where: { id: post.id },
      data: {
        carouselStage: CAROUSEL_STAGE.COMPLETED,
        status: POST_STATUS.COMPLETED,
        metadataStatus: METADATA_STATUS.GENERATING,
      },
    });
  });

  debugLog(`[carousel/publish] postId=${post.id} wrote ${paths.length} slides`);

  await enqueuePostMetadataGenerateJob({ postId: post.id });

  try {
    await broadcastWithContext("carousel-publish", () =>
      broadcastPostStatusUpdate(userId, post.id, POST_STATUS.COMPLETED),
    );
  } catch (broadcastErr) {
    console.error(`[carousel/publish] Broadcast failed for postId=${post.id}:`, broadcastErr);
  }

  return NextResponse.json({ ok: true, slideCount: paths.length });
});
