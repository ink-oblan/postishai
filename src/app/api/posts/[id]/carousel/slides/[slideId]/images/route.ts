import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> },
  { userId },
) {
  const { id, slideId } = await params;

  const slide = await prisma.carouselSlide.findFirst({
    where: { id: slideId, postId: id, post: { userId } },
    select: {
      images: {
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, prompt: true },
      },
    },
  });
  if (!slide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ images: slide.images });
});
