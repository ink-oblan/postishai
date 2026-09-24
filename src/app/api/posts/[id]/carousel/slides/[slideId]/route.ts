import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { parseDesignDocument } from "@/lib/design/document";

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
      { error: "Slides can only be edited while the carousel is being edited" },
      { status: 409 },
    );
  }

  const body = await req.json();
  const parsed = parseDesignDocument((body as { design?: unknown }).design);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid slide design" }, { status: 400 });
  }
  // A save that silently drops layers would lose the user's work without telling them.
  if (parsed.dropped > 0) {
    return NextResponse.json(
      { error: `${parsed.dropped} layer(s) could not be saved` },
      { status: 400 },
    );
  }

  const updated = await prisma.carouselSlide.update({
    where: { id: slideId },
    data: { design: parsed.document as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ id: updated.id, design: updated.design });
});
