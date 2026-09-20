import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import {
  generateScenario,
  mockScenario,
  SCENARIO_PLANNING_ERROR,
  ScenarioResponseError,
  type ScenarioSlide,
} from "@/lib/carousel/scenario";
import { CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isMockEnabled, MOCK_TIMINGS, mockDelay } from "@/lib/mock-config";

/**
 * Rewrites a single slide in place. Rewriting the whole plan goes through the worker instead
 * (`scenario/plan`) — one slide is a small enough edit to keep the editor mounted while it runs.
 */
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
  if (post.status === POST_STATUS.GENERATING) {
    return NextResponse.json({ error: SCENARIO_PLANNING_ERROR }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const slideId = (body as { slideId?: unknown }).slideId;
  const targetId = typeof slideId === "string" && slideId ? slideId : null;
  if (!targetId) {
    return NextResponse.json({ error: "A slide is required" }, { status: 400 });
  }

  const index = post.slides.findIndex((slide) => slide.id === targetId);
  if (index < 0) {
    return NextResponse.json({ error: "Unknown slide" }, { status: 400 });
  }

  const slideCount = post.slides.length;

  let generated: ScenarioSlide[];
  try {
    if (isMockEnabled()) {
      await mockDelay(MOCK_TIMINGS.CAROUSEL_SCENARIO);
      generated = mockScenario(post.title, slideCount);
    } else {
      generated = await generateScenario({
        title: post.title,
        platform: post.platform,
        slideCount,
        details: post.details,
        brand: post.brandProfile,
        llmModelId: post.llmModelId,
      });
    }
  } catch (err) {
    if (err instanceof ScenarioResponseError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error(`[carousel/scenario/regenerate] postId=${post.id} failed:`, err);
    return NextResponse.json({ error: "Failed to replan the carousel" }, { status: 500 });
  }

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

  const slides = await prisma.carouselSlide.findMany({
    where: { postId: post.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ slides });
});
