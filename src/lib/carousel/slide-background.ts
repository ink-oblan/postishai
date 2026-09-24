import type { BrandProfile, Platform } from "@prisma/client";
import { type ColorItem, parseList } from "@/lib/brand-fields";
import { carouselSpec } from "@/lib/carousel/platform-spec";
import { coerceLayout } from "@/lib/carousel/scenario";
import { buildSlideImagePrompt } from "@/lib/carousel/slide-image";
import { enqueueCarouselSlideImageJob } from "@/lib/worker/jobs";

/**
 * Lives apart from `slide-image.ts` because the worker imports that module, and reaching the job
 * queue from there would close a cycle back through the registry.
 */
export async function queueSlideBackground(options: {
  slideId: string;
  visualPrompt: string;
  layout: unknown;
  platform: Platform;
  imageModel: string;
  brand: BrandProfile | null;
}): Promise<void> {
  const prompt = await buildSlideImagePrompt({
    visualPrompt: options.visualPrompt,
    layout: coerceLayout(options.layout),
    photoStyle: options.brand?.photoStyle,
    colors: parseList<ColorItem>(options.brand?.colors),
  });

  await enqueueCarouselSlideImageJob({
    slideId: options.slideId,
    prompt,
    imageModel: options.imageModel,
    aspectRatio: carouselSpec(options.platform).backgroundAspectRatio,
  });
}
