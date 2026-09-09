import type { Platform } from "@prisma/client";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { AspectRatio } from "@/lib/image-models/types";

export interface CarouselPlatformSpec {
  canvas: CanvasSpec;
  minSlides: number;
  maxSlides: number;
  backgroundAspectRatio: AspectRatio;
}

export const CAROUSEL_PLATFORM_SPECS: Record<Platform, CarouselPlatformSpec> = {
  INSTAGRAM: {
    canvas: {
      width: 1080,
      height: 1350,
      safeZone: { top: 50, right: 50, bottom: 200, left: 50 },
    },
    minSlides: 2,
    maxSlides: 20,
    // No 4:5 in ImageConfig.aspectRatio — 3:4 comes back tall and is cover-cropped to 1080x1350.
    backgroundAspectRatio: "3:4",
  },
  TIKTOK: {
    canvas: {
      width: 1080,
      height: 1920,
      safeZone: { top: 150, right: 50, bottom: 380, left: 50 },
    },
    minSlides: 4,
    maxSlides: 35,
    backgroundAspectRatio: "9:16",
  },
  YOUTUBE_SHORTS: {
    canvas: {
      width: 1080,
      height: 1920,
      safeZone: { top: 150, right: 50, bottom: 380, left: 50 },
    },
    minSlides: 2,
    maxSlides: 10,
    backgroundAspectRatio: "9:16",
  },
};

export function carouselSpec(platform: Platform): CarouselPlatformSpec {
  return CAROUSEL_PLATFORM_SPECS[platform];
}

export function carouselCanvas(platform: Platform): CanvasSpec {
  return CAROUSEL_PLATFORM_SPECS[platform].canvas;
}

export function isValidSlideCount(platform: Platform, count: number): boolean {
  const spec = carouselSpec(platform);
  return Number.isInteger(count) && count >= spec.minSlides && count <= spec.maxSlides;
}

export function slideCountError(platform: Platform, count: number): string | null {
  if (isValidSlideCount(platform, count)) return null;

  const spec = carouselSpec(platform);
  return `${platform} carousels take between ${spec.minSlides} and ${spec.maxSlides} slides`;
}
