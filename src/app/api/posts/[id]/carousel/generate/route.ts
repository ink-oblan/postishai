import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { type ColorItem, parseList } from "@/lib/brand-fields";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { coerceLayout, SCENARIO_PLANNING_ERROR } from "@/lib/carousel/scenario";
import { queueSlideBackground } from "@/lib/carousel/slide-background";
import { carouselFontPair, carouselLayoutTheme } from "@/lib/carousel/theme";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { DesignDocument } from "@/lib/design/document";
import { expandLayout, layoutAutoLayout } from "@/lib/design/layouts";
import { PLACEHOLDER_BACKGROUND_COLOR } from "@/lib/design/placeholder";
import { DEFAULT_IMAGE_MODEL_ID, getImageAdapter } from "@/lib/image-models/registry";

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
      { error: "This carousel has already been generated" },
      { status: 409 },
    );
  }
  if (post.status === POST_STATUS.GENERATING) {
    return NextResponse.json({ error: SCENARIO_PLANNING_ERROR }, { status: 409 });
  }
  if (post.slides.length === 0) {
    return NextResponse.json({ error: "This carousel has no slides" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const requestedModel = (body as { imageModelId?: unknown }).imageModelId;
  const imageModel =
    typeof requestedModel === "string" && requestedModel ? requestedModel : DEFAULT_IMAGE_MODEL_ID;
  try {
    getImageAdapter(imageModel);
  } catch {
    return NextResponse.json({ error: "Unknown image model" }, { status: 400 });
  }

  const canvas = carouselCanvas(post.platform);

  const colors = parseList<ColorItem>(post.brandProfile?.colors);
  const fontPair = carouselFontPair(post.brandProfile);
  const { fonts: layoutFonts, colors: layoutColors } = carouselLayoutTheme(post.brandProfile);

  await prisma.$transaction(async (tx) => {
    for (const slide of post.slides) {
      const layout = coerceLayout(slide.layout);
      const design: DesignDocument = {
        // The real path lands when the image job finishes; until then the slide draws flat.
        background: { kind: "solid", color: PLACEHOLDER_BACKGROUND_COLOR },
        // Laid out here against an estimate; the editor restacks it once it can measure the font.
        autoLayout: layoutAutoLayout(layout),
        layers: expandLayout(layout, {
          spec: canvas,
          headline: slide.headline,
          body: slide.body,
          fonts: layoutFonts,
          colors: layoutColors,
        }),
      };

      await tx.carouselSlide.update({
        where: { id: slide.id },
        data: {
          design: design as unknown as Prisma.InputJsonValue,
          status: CAROUSEL_SLIDE_STATUS.PENDING,
          errorMessage: null,
        },
      });
    }

    await tx.post.update({
      where: { id: post.id },
      data: {
        carouselStage: CAROUSEL_STAGE.EDITING,
        status: POST_STATUS.GENERATING,
        carouselFonts: {
          heading: fontPair.heading,
          body: fontPair.body,
        } as unknown as Prisma.InputJsonValue,
        carouselColors: colors as unknown as Prisma.InputJsonValue,
      },
    });
  });

  const queued = await Promise.allSettled(
    post.slides.map((slide) =>
      queueSlideBackground({
        slideId: slide.id,
        visualPrompt: slide.visualPrompt,
        layout: slide.layout,
        platform: post.platform,
        imageModel,
        brand: post.brandProfile,
      }),
    ),
  );

  const failed = queued.flatMap((result, index) =>
    result.status === "rejected" ? [{ slide: post.slides[index], reason: result.reason }] : [],
  );

  if (failed.length > 0) {
    for (const { slide, reason } of failed) {
      console.error(
        `[carousel/generate] postId=${post.id} slideId=${slide.id} enqueue failed:`,
        reason,
      );
    }

    await prisma.carouselSlide.updateMany({
      where: { id: { in: failed.map(({ slide }) => slide.id) } },
      data: {
        status: CAROUSEL_SLIDE_STATUS.FAILED,
        errorMessage: "The background job could not be queued",
      },
    });

    const unsettled = await prisma.carouselSlide.count({
      where: {
        postId: post.id,
        status: { in: [CAROUSEL_SLIDE_STATUS.PENDING, CAROUSEL_SLIDE_STATUS.GENERATING] },
      },
    });
    if (unsettled === 0) {
      await prisma.post.updateMany({
        where: {
          id: post.id,
          status: POST_STATUS.GENERATING,
          carouselStage: CAROUSEL_STAGE.EDITING,
        },
        data: { status: POST_STATUS.DRAFT },
      });
    }
  }

  return NextResponse.json({ ok: true, slideCount: post.slides.length });
});
