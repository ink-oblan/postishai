import type { BrandProfile } from "@prisma/client";
import { type ColorItem, type FontItem, parseList } from "@/lib/brand-fields";
import { type FontPair, pickFontPair, resolveFont } from "@/lib/design/fonts";
import type { LayoutColors, LayoutFonts } from "@/lib/design/layouts";
import { DEFAULT_PLATE_COLOR } from "@/lib/design/plate";

export const DEFAULT_HEADING_COLOR = "#ffffff";
export const DEFAULT_BODY_COLOR = "#ededed";
export const DEFAULT_CAROUSEL_FONT_PAIR = {
  heading: { id: "poppins", name: "Poppins", source: "builtin" },
  body: { id: "inter", name: "Inter", source: "builtin" },
} as const satisfies FontPair;

export interface CarouselLayoutTheme {
  fonts: LayoutFonts;
  colors: LayoutColors;
}

export function carouselFontPair(brand: BrandProfile | null): FontPair {
  return (
    pickFontPair(parseList<FontItem>(brand?.typography)) ?? {
      heading: DEFAULT_CAROUSEL_FONT_PAIR.heading,
      body: DEFAULT_CAROUSEL_FONT_PAIR.body,
    }
  );
}

/**
 * The plate behind the copy is what keeps light text readable over an arbitrary photo, so it
 * wants the darkest colour the brand has rather than its most characteristic one.
 */
export function darkest(colors: ColorItem[]): string {
  let best = DEFAULT_PLATE_COLOR;
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

// Font families are resolved to real CSS names in the browser, where the catalogue lives.
// Uploaded faces must use the same identifier as registerUploadedFont.
export function carouselLayoutTheme(brand: BrandProfile | null): CarouselLayoutTheme {
  const fontPair = carouselFontPair(brand);

  return {
    fonts: {
      heading: resolveFont(fontPair.heading, (name) => name).family,
      body: resolveFont(fontPair.body, (name) => name).family,
    },
    colors: {
      heading: DEFAULT_HEADING_COLOR,
      body: DEFAULT_BODY_COLOR,
      plate: darkest(parseList<ColorItem>(brand?.colors)),
    },
  };
}
