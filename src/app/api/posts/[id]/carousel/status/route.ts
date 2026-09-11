import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { slideImageState } from "@/lib/carousel/slide-view";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId, type: "CAROUSEL" },
    select: {
      carouselStage: true,
      status: true,
      slides: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          status: true,
          errorMessage: true,
          imagePath: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slides = post.slides.map((slide) => ({
    id: slide.id,
    order: slide.order,
    status: slide.status,
    errorMessage: slide.errorMessage,
    ...slideImageState(slide),
  }));

  return NextResponse.json({
    carouselStage: post.carouselStage,
    status: post.status,
    slides,
    pending: slides.filter(
      (slide) =>
        slide.status === CAROUSEL_SLIDE_STATUS.PENDING ||
        slide.status === CAROUSEL_SLIDE_STATUS.GENERATING,
    ).length,
    failed: slides.filter((slide) => slide.status === CAROUSEL_SLIDE_STATUS.FAILED).length,
  });
});
