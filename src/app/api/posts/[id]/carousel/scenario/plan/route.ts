import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { slideCountError } from "@/lib/carousel/platform-spec";
import { SCENARIO_PLANNING_ERROR } from "@/lib/carousel/scenario";
import { CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { enqueueCarouselScenarioJob } from "@/lib/worker/jobs";

/**
 * Writes the whole plan from scratch. Rewriting every slide and retrying a plan that never
 * landed are the same job — one asks the model for N slides and replaces whatever is there.
 */
export const POST = withAuth(async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId, type: "CAROUSEL", archivedAt: null },
    select: {
      id: true,
      platform: true,
      status: true,
      carouselStage: true,
      carouselSlideCount: true,
      _count: { select: { slides: true } },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.carouselStage !== CAROUSEL_STAGE.SCENARIO) {
    return NextResponse.json(
      { error: "The plan can only be rewritten before the carousel is generated" },
      { status: 409 },
    );
  }
  if (post.status === POST_STATUS.GENERATING) {
    return NextResponse.json({ error: SCENARIO_PLANNING_ERROR }, { status: 409 });
  }

  // A rewrite keeps the length the editor settled on; a retry has no slides left to count.
  const slideCount = post._count.slides || post.carouselSlideCount || 0;
  if (slideCountError(post.platform, slideCount)) {
    return NextResponse.json(
      { error: "This carousel no longer knows how many slides to plan" },
      { status: 409 },
    );
  }

  await enqueueCarouselScenarioJob({ postId: post.id, slideCount });

  return NextResponse.json({ ok: true, slideCount });
});
