import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { type ColorItem, parseList } from "@/lib/brand-fields";
import { carouselSpec } from "@/lib/carousel/platform-spec";
import { buildSlideImagePrompt } from "@/lib/carousel/slide-image";
import { CAROUSEL_STAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { DEFAULT_LAYOUT, isLayoutName } from "@/lib/design/layouts";
import { DEFAULT_IMAGE_MODEL_ID, getImageAdapter } from "@/lib/image-models/registry";
import { enqueueCarouselSlideImageJob, hasActiveJob } from "@/lib/worker/jobs";

const MAX_VISUAL_PROMPT = 400;

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
  const rawPrompt = (body as { visualPrompt?: unknown }).visualPrompt;
  const visualPrompt =
    typeof rawPrompt === "string" && rawPrompt.trim()
      ? rawPrompt.trim().slice(0, MAX_VISUAL_PROMPT)
      : slide.visualPrompt;

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

  if (
    await hasActiveJob("carousel.slide.image.generate", {
      slideId,
      prompt: "",
      imageModel,
      aspectRatio: "9:16",
    })
  ) {
    return NextResponse.json({ error: "This slide is already generating" }, { status: 409 });
  }

  if (visualPrompt !== slide.visualPrompt) {
    await prisma.carouselSlide.update({ where: { id: slideId }, data: { visualPrompt } });
  }

  const layout = isLayoutName(slide.layout) ? slide.layout : DEFAULT_LAYOUT;
  const prompt = await buildSlideImagePrompt({
    visualPrompt,
    layout,
    photoStyle: slide.post.brandProfile?.photoStyle,
    colors: parseList<ColorItem>(slide.post.brandProfile?.colors),
  });

  await enqueueCarouselSlideImageJob({
    slideId,
    prompt,
    imageModel,
    aspectRatio: carouselSpec(slide.post.platform).backgroundAspectRatio,
  });

  return NextResponse.json({ ok: true });
});
