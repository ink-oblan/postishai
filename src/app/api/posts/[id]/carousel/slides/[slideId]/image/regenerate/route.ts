import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { clampText, MAX_VISUAL_PROMPT } from "@/lib/carousel/scenario";
import { queueSlideBackground } from "@/lib/carousel/slide-background";
import { CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { DEFAULT_IMAGE_MODEL_ID, getImageAdapter } from "@/lib/image-models/registry";
import { hasActiveJob } from "@/lib/worker/jobs";

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> },
  { userId },
) {
  const { id, slideId } = await params;

  const slide = await prisma.carouselSlide.findFirst({
    where: { id: slideId, postId: id, post: { userId, type: "CAROUSEL", archivedAt: null } },
    include: { post: { include: { brandProfile: true } } },
  });
  if (!slide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (slide.post.carouselStage !== CAROUSEL_STAGE.EDITING) {
    return NextResponse.json(
      { error: "Backgrounds can only be regenerated while the carousel is being edited" },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const visualPrompt =
    clampText((body as { visualPrompt?: unknown }).visualPrompt, MAX_VISUAL_PROMPT) ||
    slide.visualPrompt;

  const requestedModel = (body as { imageModelId?: unknown }).imageModelId;
  const imageModel =
    typeof requestedModel === "string" && requestedModel
      ? requestedModel
      : (slide.imageModel ?? DEFAULT_IMAGE_MODEL_ID);
  try {
    getImageAdapter(imageModel);
  } catch {
    return NextResponse.json({ error: "Unknown image model" }, { status: 400 });
  }

  if (await hasActiveJob("carousel.slide.image.generate", { slideId })) {
    return NextResponse.json({ error: "This slide is already generating" }, { status: 409 });
  }

  if (visualPrompt !== slide.visualPrompt) {
    await prisma.carouselSlide.update({ where: { id: slideId }, data: { visualPrompt } });
  }

  await queueSlideBackground({
    slideId,
    visualPrompt,
    layout: slide.layout,
    platform: slide.post.platform,
    imageModel,
    brand: slide.post.brandProfile,
  });

  return NextResponse.json({ ok: true });
});
