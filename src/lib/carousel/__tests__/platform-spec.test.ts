import type { Platform } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CAROUSEL_PLATFORM_SPECS,
  carouselCanvas,
  isValidSlideCount,
  slideCountError,
} from "@/lib/carousel/platform-spec";
import { coverCrop, safeArea } from "@/lib/design/canvas-spec";

const PLATFORMS = Object.keys(CAROUSEL_PLATFORM_SPECS) as Platform[];

describe("carousel platform spec", () => {
  it("puts Instagram at 4:5 and the vertical feeds at 9:16", () => {
    expect(carouselCanvas("INSTAGRAM")).toMatchObject({ width: 1080, height: 1350 });
    expect(carouselCanvas("TIKTOK")).toMatchObject({ width: 1080, height: 1920 });
    expect(carouselCanvas("YOUTUBE_SHORTS")).toMatchObject({ width: 1080, height: 1920 });
  });

  it("asks for 3:4 on Instagram, since the image API has no 4:5", () => {
    expect(CAROUSEL_PLATFORM_SPECS.INSTAGRAM.backgroundAspectRatio).toBe("3:4");
    expect(CAROUSEL_PLATFORM_SPECS.TIKTOK.backgroundAspectRatio).toBe("9:16");
  });

  it("leaves a usable safe area on every platform", () => {
    for (const platform of PLATFORMS) {
      const area = safeArea(carouselCanvas(platform));
      expect(area.width).toBeGreaterThan(0);
      expect(area.height).toBeGreaterThan(0);
    }
  });

  it("holds TikTok to its four-slide minimum", () => {
    expect(isValidSlideCount("TIKTOK", 3)).toBe(false);
    expect(isValidSlideCount("TIKTOK", 4)).toBe(true);
    expect(slideCountError("TIKTOK", 3)).toContain("between 4 and 35");
  });

  it("rejects counts past each platform's ceiling", () => {
    expect(isValidSlideCount("YOUTUBE_SHORTS", 10)).toBe(true);
    expect(isValidSlideCount("YOUTUBE_SHORTS", 11)).toBe(false);
    expect(isValidSlideCount("INSTAGRAM", 20)).toBe(true);
    expect(isValidSlideCount("INSTAGRAM", 21)).toBe(false);
  });

  it("rejects fractional counts", () => {
    expect(isValidSlideCount("INSTAGRAM", 4.5)).toBe(false);
  });

  it("passes a valid count with no error", () => {
    expect(slideCountError("INSTAGRAM", 5)).toBeNull();
  });
});

describe("coverCrop", () => {
  it("trims the height of a 3:4 source down to a 4:5 frame", () => {
    const canvas = carouselCanvas("INSTAGRAM");
    const crop = coverCrop(1080, 1440, canvas);

    expect(crop.width).toBeCloseTo(1080);
    expect(crop.height).toBeCloseTo(1350);
    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(45);
  });

  it("takes the whole source when the ratios already agree", () => {
    const canvas = carouselCanvas("TIKTOK");
    const crop = coverCrop(1080, 1920, canvas);

    expect(crop).toMatchObject({ x: 0, y: 0, width: 1080, height: 1920 });
  });

  it("trims width when the source is too wide", () => {
    const crop = coverCrop(2000, 1350, carouselCanvas("INSTAGRAM"));

    expect(crop.height).toBeCloseTo(1350);
    expect(crop.width).toBeCloseTo(1080);
    expect(crop.x).toBeCloseTo(460);
  });
});
