import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { slideCountError } from "@/lib/carousel/platform-spec";
import {
  clampText,
  coerceLayout,
  MAX_BODY,
  MAX_HEADLINE,
  MAX_VISUAL_PROMPT,
} from "@/lib/carousel/scenario";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";

interface SlideInput {
  id?: string;
  headline: string;
  body: string;
  visualPrompt: string;
  layout: string;
}

function parseSlides(value: unknown): SlideInput[] | null {
  if (!Array.isArray(value)) return null;

  const slides: SlideInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const entry = raw as Record<string, unknown>;

    const headline = clampText(entry.headline, MAX_HEADLINE);
    const visualPrompt = clampText(entry.visualPrompt, MAX_VISUAL_PROMPT);
    if (!headline || !visualPrompt) return null;

    slides.push({
      ...(typeof entry.id === "string" && entry.id ? { id: entry.id } : {}),
      headline,
      body: clampText(entry.body, MAX_BODY),
      visualPrompt,
      layout: coerceLayout(entry.layout),
    });
  }

  return slides;
}

export const PATCH = withAuth(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId, type: "CAROUSEL", archivedAt: null },
    include: { slides: { select: { id: true } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.carouselStage !== CAROUSEL_STAGE.SCENARIO) {
    return NextResponse.json(
      { error: "The scenario can only be edited before the carousel is generated" },
      { status: 409 },
    );
  }

  const body = await req.json();
  const slides = parseSlides((body as { slides?: unknown }).slides);
  if (!slides) {
    return NextResponse.json(
      { error: "Every slide needs a headline and a visual prompt" },
      { status: 400 },
    );
  }

  const countError = slideCountError(post.platform, slides.length);
  if (countError) {
    return NextResponse.json({ error: countError }, { status: 400 });
  }

  const existingIds = new Set(post.slides.map((slide) => slide.id));
  const keptIds = new Set(slides.flatMap((slide) => (slide.id ? [slide.id] : [])));
  for (const keptId of keptIds) {
    if (!existingIds.has(keptId)) {
      return NextResponse.json({ error: "Unknown slide" }, { status: 400 });
    }
  }

  // `@@unique([postId, order])` would trip while the new order overlaps the old, so the kept
  // rows are parked past the end of the range before being written back at their final index.
  const parkOffset = post.slides.length + slides.length + 1;

  await prisma.$transaction(async (tx) => {
    await tx.carouselSlide.deleteMany({
      where: { postId: post.id, id: { notIn: [...keptIds] } },
    });

    await Promise.all(
      [...keptIds].map((slideId, index) =>
        tx.carouselSlide.update({
          where: { id: slideId },
          data: { order: parkOffset + index },
        }),
      ),
    );

    const written = slides.map((slide, order) => ({
      id: slide.id,
      data: {
        order,
        headline: slide.headline,
        body: slide.body || null,
        visualPrompt: slide.visualPrompt,
        layout: slide.layout,
      },
    }));

    await Promise.all(
      written
        .filter((slide) => slide.id)
        .map((slide) => tx.carouselSlide.update({ where: { id: slide.id }, data: slide.data })),
    );

    await tx.carouselSlide.createMany({
      data: written
        .filter((slide) => !slide.id)
        .map((slide) => ({
          ...slide.data,
          postId: post.id,
          status: CAROUSEL_SLIDE_STATUS.PENDING,
        })),
    });
  });

  const updated = await prisma.carouselSlide.findMany({
    where: { postId: post.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ slides: updated });
});
