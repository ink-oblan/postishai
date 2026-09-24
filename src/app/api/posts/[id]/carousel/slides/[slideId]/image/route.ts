import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";

/**
 * Always proxies the bytes and never redirects to a presigned URL, unlike the post media route.
 * The editor draws these into a Konva canvas it then reads back with `toDataURL`, and a
 * cross-origin image would taint that canvas — which fails only in S3 mode, i.e. production.
 */
export const GET = withAuth(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> },
  { userId },
) {
  const { id, slideId } = await params;
  const version = req.nextUrl.searchParams.get("v");

  const slide = await prisma.carouselSlide.findFirst({
    where: { id: slideId, postId: id, post: { userId } },
    select: { imagePath: true, images: version ? { where: { id: version } } : false },
  });
  if (!slide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const path = version ? slide.images?.[0]?.imagePath : slide.imagePath;
  if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await readFile(path);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});

/** Switch the slide back to one of its earlier backgrounds. */
export const PATCH = withAuth(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> },
  { userId },
) {
  const { id, slideId } = await params;

  const slide = await prisma.carouselSlide.findFirst({
    where: { id: slideId, postId: id, post: { userId, type: "CAROUSEL", archivedAt: null } },
    select: { id: true, post: { select: { carouselStage: true } } },
  });
  if (!slide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (slide.post.carouselStage !== CAROUSEL_STAGE.EDITING) {
    return NextResponse.json(
      { error: "Backgrounds can only be changed while the carousel is being edited" },
      { status: 409 },
    );
  }

  const body = await req.json();
  const imageId = (body as { imageId?: unknown }).imageId;
  if (typeof imageId !== "string" || !imageId) {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  const image = await prisma.carouselSlideImage.findFirst({
    where: { id: imageId, slideId },
    select: { imagePath: true },
  });
  if (!image) return NextResponse.json({ error: "Unknown background" }, { status: 404 });

  const updated = await prisma.carouselSlide.update({
    where: { id: slideId },
    data: { imagePath: image.imagePath, status: CAROUSEL_SLIDE_STATUS.COMPLETED },
  });

  return NextResponse.json({ ok: true, imageVersion: updated.updatedAt.getTime() });
});
