import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import {
  generateScenario,
  mockScenario,
  ScenarioResponseError,
  type ScenarioSlide,
} from "@/lib/carousel/scenario";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isMockEnabled } from "@/lib/mock-config";

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId, type: "CAROUSEL", archivedAt: null },
    include: { brandProfile: true, slides: { orderBy: { order: "asc" } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.carouselStage !== CAROUSEL_STAGE.SCENARIO) {
    return NextResponse.json(
      { error: "The scenario can only be regenerated before the carousel is generated" },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const slideId = (body as { slideId?: unknown }).slideId;
  const targetId = typeof slideId === "string" && slideId ? slideId : null;

  if (targetId && !post.slides.some((slide) => slide.id === targetId)) {
    return NextResponse.json({ error: "Unknown slide" }, { status: 400 });
  }

  const slideCount = post.slides.length;

  let generated: ScenarioSlide[];
  try {
    generated = isMockEnabled()
      ? mockScenario(post.title, slideCount)
      : await generateScenario({
          title: post.title,
          platform: post.platform,
          slideCount,
          details: post.details,
          brand: post.brandProfile,
          llmModelId: post.llmModelId,
        });
  } catch (err) {
    if (err instanceof ScenarioResponseError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error(`[carousel/scenario/regenerate] postId=${post.id} failed:`, err);
    return NextResponse.json({ error: "Failed to replan the carousel" }, { status: 500 });
  }

  if (targetId) {
    const index = post.slides.findIndex((slide) => slide.id === targetId);
    const replacement = generated[index] ?? generated[0];

    await prisma.carouselSlide.update({
      where: { id: targetId },
      data: {
        headline: replacement.headline,
        body: replacement.body || null,
        visualPrompt: replacement.visualPrompt,
        layout: replacement.layout,
      },
    });
  } else {
    await prisma.$transaction(
      post.slides.map((slide, index) =>
        prisma.carouselSlide.update({
          where: { id: slide.id },
          data: {
            headline: generated[index].headline,
            body: generated[index].body || null,
            visualPrompt: generated[index].visualPrompt,
            layout: generated[index].layout,
            status: CAROUSEL_SLIDE_STATUS.PENDING,
          },
        }),
      ),
    );
  }

  const slides = await prisma.carouselSlide.findMany({
    where: { postId: post.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ slides });
});
