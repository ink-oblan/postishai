import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { type ColorItem, type FontItem, parseList } from "@/lib/brand-fields";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { coerceLayout } from "@/lib/carousel/scenario";
import { queueSlideBackground } from "@/lib/carousel/slide-background";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { DesignDocument } from "@/lib/design/document";
import { pickFontPair } from "@/lib/design/fonts";
import { expandLayout, layoutAutoLayout, layoutOverlay } from "@/lib/design/layouts";
import { DEFAULT_IMAGE_MODEL_ID, getImageAdapter } from "@/lib/image-models/registry";

const DEFAULT_HEADING_COLOR = "#ffffff";
const DEFAULT_BODY_COLOR = "#ededed";
const DEFAULT_SCRIM_COLOR = "#000000";

/**
 * The scrim is what keeps light text readable over an arbitrary photo, so it wants the darkest
 * colour the brand has rather than its most characteristic one.
 */
function darkest(colors: ColorItem[]): string {
  let best = DEFAULT_SCRIM_COLOR;
  let bestLuminance = Number.POSITIVE_INFINITY;

  for (const color of colors) {
    const hex = color.hex.slice(1, 7);
    if (hex.length < 6) continue;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luminance < bestLuminance) {
      bestLuminance = luminance;
      best = color.hex;
    }
  }

  return best;
}

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

  const typography = parseList<FontItem>(post.brandProfile?.typography);
  const colors = parseList<ColorItem>(post.brandProfile?.colors);
  const fontPair = pickFontPair(typography);

  // Font families are resolved to real CSS names in the browser, where the catalogue lives.
  // Storing the brand's own names keeps the document readable without that lookup.
  const layoutFonts = {
    heading: fontPair?.heading.name ?? "Inter",
    body: fontPair?.body.name ?? "Inter",
  };
  const layoutColors = {
    heading: DEFAULT_HEADING_COLOR,
    body: DEFAULT_BODY_COLOR,
    scrim: darkest(colors),
  };

  await prisma.$transaction(async (tx) => {
    for (const slide of post.slides) {
      const layout = coerceLayout(slide.layout);
      const design: DesignDocument = {
        // The real path lands when the image job finishes; until then the slide draws its scrim.
        background: { kind: "solid", color: layoutColors.scrim },
        overlay: layoutOverlay(layout, layoutColors),
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
        carouselFonts: (fontPair
          ? { heading: fontPair.heading, body: fontPair.body }
          : null) as unknown as Prisma.InputJsonValue,
        carouselColors: colors as unknown as Prisma.InputJsonValue,
      },
    });
  });

  await Promise.all(
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

  return NextResponse.json({ ok: true, slideCount: post.slides.length });
});
