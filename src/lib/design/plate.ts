import {
  composite,
  contrastRatio,
  type Hsl,
  hexToRgb,
  hslToRgb,
  type Rgb,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
} from "@/lib/design/color";
import type { DesignDocument, TextBackground } from "@/lib/design/document";

export const DEFAULT_PLATE_COLOR = "#000000";
export const DEFAULT_PLATE_OPACITY = 0.5;

/** Used only where a document carries no stack gap to derive the padding from. */
export const DEFAULT_PLATE_PADDING = 16;

/**
 * Half the stack gap, so the plate behind the headline meets the one behind the body rather than
 * leaving a stripe of photograph between them: the pair reads as one band, not two labels.
 */
export function platePaddingForGap(gap: number): number {
  return Math.round(gap / 2);
}

/** Large display copy would pass at 3:1, but the body under it is not always large. */
const MIN_TEXT_CONTRAST = 4.5;

/**
 * A plate that keeps the photo's own hue reads as part of the picture; one that keeps its
 * saturation reads as a highlighter. Past this the tint is cut back towards grey.
 */
const MAX_PLATE_SATURATION = 0.5;

/** Coarse enough to settle in a few dozen steps, fine enough not to overshoot into mud. */
const LIGHTNESS_STEP = 0.02;

function meetsContrast(plate: Hsl, sample: Rgb, text: Rgb, opacity: number): boolean {
  return contrastRatio(composite(hslToRgb(plate), sample, opacity), text) >= MIN_TEXT_CONTRAST;
}

/**
 * Picks the plate colour for a slide: the hue sampled from the photograph behind the copy, pushed
 * away from the text's own lightness only as far as it takes to clear `MIN_TEXT_CONTRAST` once
 * the plate is composited over that photograph at its own opacity.
 *
 * Stopping at the first passing step is the point — it is the least darkening (or lightening) the
 * text can live with, so the photo keeps as much of itself as legibility allows. Black at the
 * plate's own opacity is the floor rather than the starting point.
 *
 * Every colour on the slide has to clear the bar, not just the first one: a generated slide sets
 * its heading in white and its body a shade under, and tuning to the heading alone leaves the
 * body below target on exactly the pale photographs this is for.
 */
export function inferPlateColor(options: {
  sample: Rgb;
  textColors: string[];
  opacity?: number;
}): string {
  const { sample, textColors, opacity = DEFAULT_PLATE_OPACITY } = options;
  const texts = textColors.flatMap((color) => hexToRgb(color) ?? []);
  if (texts.length === 0) return DEFAULT_PLATE_COLOR;

  const { h, s, l } = rgbToHsl(sample);
  const tint = { h, s: Math.min(s, MAX_PLATE_SATURATION), l };

  // Light copy wants the plate driven down towards black, dark copy up towards white. Mixed copy
  // cannot have both, so the majority weight decides and the loser rides on whatever it gets.
  const meanTextLuminance =
    texts.reduce((total, text) => total + relativeLuminance(text), 0) / texts.length;
  const towardsBlack = meanTextLuminance > relativeLuminance(sample);
  const limit = towardsBlack ? 0 : 1;

  for (
    let step = tint.l;
    towardsBlack ? step >= limit : step <= limit;
    step += towardsBlack ? -LIGHTNESS_STEP : LIGHTNESS_STEP
  ) {
    const candidate = { ...tint, l: Math.min(1, Math.max(0, step)) };
    if (texts.every((text) => meetsContrast(candidate, sample, text, opacity))) {
      return rgbToHex(hslToRgb(candidate));
    }
  }

  // Even the extreme could not carry the text — the caller's own fallback is no better.
  return rgbToHex(hslToRgb({ ...tint, l: limit }));
}

export function defaultTextPlate(color: string = DEFAULT_PLATE_COLOR): TextBackground {
  return {
    color,
    opacity: DEFAULT_PLATE_OPACITY,
    padding: DEFAULT_PLATE_PADDING,
    // Square, because rounding the corners notches the seam where two plates meet.
    cornerRadius: 0,
  };
}

/**
 * The area the plates would cover, taken as one box across every text layer. Sampling the union
 * rather than each block separately is what keeps a headline and the body under it on the same
 * colour — two plates meeting at a seam in two different tints would read as a mistake.
 */
export function platedRegion(document: DesignDocument, fallbackPadding = DEFAULT_PLATE_PADDING) {
  const boxes = document.layers.flatMap((layer) => {
    if (layer.type !== "text") return [];
    const pad = layer.background?.padding ?? fallbackPadding;
    return [
      {
        left: layer.x - pad,
        top: layer.y - pad,
        right: layer.x + layer.width + pad,
        bottom: layer.y + layer.height + pad,
      },
    ];
  });
  if (boxes.length === 0) return null;

  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Every distinct colour the copy on a slide is set in — all of which a plate has to carry. */
export function textColorsOf(document: DesignDocument): string[] {
  return [
    ...new Set(document.layers.flatMap((layer) => (layer.type === "text" ? [layer.color] : []))),
  ];
}

/**
 * Sets or clears the plate on every text layer, leaving shapes and logos alone. Geometry already
 * on a layer is kept — only the look is pushed across — so applying to a whole carousel cannot
 * reopen a seam that the layout's own gap had closed.
 */
export function withTextPlates(
  document: DesignDocument,
  plate: TextBackground | null,
): DesignDocument {
  const padding = document.autoLayout
    ? platePaddingForGap(document.autoLayout.gap)
    : DEFAULT_PLATE_PADDING;

  const layers = document.layers.map((layer) => {
    if (layer.type !== "text") return layer;

    if (!plate) {
      if (!layer.background) return layer;

      const { background: _removed, ...rest } = layer;
      return rest;
    }

    // The incoming plate supplies the look; the padding stays with the layout that set it.
    const background = { ...plate, padding: layer.background?.padding ?? padding };
    return samePlate(layer.background, background) ? layer : { ...layer, background };
  });

  return layers.every((layer, index) => layer === document.layers[index])
    ? document
    : { ...document, layers };
}

function samePlate(current: TextBackground | undefined, next: TextBackground): boolean {
  return (
    current !== undefined &&
    current.color === next.color &&
    current.opacity === next.opacity &&
    current.padding === next.padding &&
    current.cornerRadius === next.cornerRadius
  );
}
