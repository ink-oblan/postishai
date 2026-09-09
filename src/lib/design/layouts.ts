import { type Box, type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer, TextAlign, TextLayer } from "@/lib/design/document";

export const LAYOUT_NAMES = ["cover", "statement", "list", "quote", "cta"] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

export const DEFAULT_LAYOUT: LayoutName = "statement";

export function isLayoutName(value: unknown): value is LayoutName {
  return typeof value === "string" && (LAYOUT_NAMES as readonly string[]).includes(value);
}

export interface LayoutFonts {
  heading: string;
  body: string;
}

export interface LayoutColors {
  heading: string;
  body: string;
  scrim: string;
}

export interface LayoutInput {
  spec: CanvasSpec;
  headline?: string | null;
  body?: string | null;
  fonts: LayoutFonts;
  colors: LayoutColors;
}

interface FittedText {
  fontSize: number;
  lines: number;
}

const AVERAGE_GLYPH_RATIO = 0.52;

export function estimateLineCount(text: string, charsPerLine: number): number {
  if (charsPerLine < 1) return text.length;

  return text.split("\n").reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return total + 1;

    let lines = 1;
    let used = 0;
    for (const word of words) {
      const needed = used === 0 ? word.length : used + 1 + word.length;
      if (needed <= charsPerLine) {
        used = needed;
      } else {
        lines++;
        used = word.length;
      }
    }
    return total + lines;
  }, 0);
}

/**
 * Largest size at which the text still fits the box, stepping down from `max`. Purely an
 * estimate — Konva does the real wrapping — but it keeps generated slides from opening with
 * a headline overflowing its frame.
 */
export function fitFontSize(
  text: string,
  box: Box,
  options: { max: number; min: number; lineHeight: number },
): FittedText {
  const { max, min, lineHeight } = options;

  for (let fontSize = max; fontSize > min; fontSize -= 2) {
    const charsPerLine = Math.floor(box.width / (fontSize * AVERAGE_GLYPH_RATIO));
    const lines = estimateLineCount(text, charsPerLine);
    if (lines * fontSize * lineHeight <= box.height) return { fontSize, lines };
  }

  const charsPerLine = Math.floor(box.width / (min * AVERAGE_GLYPH_RATIO));
  return { fontSize: min, lines: estimateLineCount(text, charsPerLine) };
}

function textLayer(
  id: string,
  box: Box,
  text: string,
  options: {
    role: TextLayer["role"];
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    align: TextAlign;
    color: string;
  },
): TextLayer {
  return {
    id,
    type: "text",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: 0,
    text,
    ...options,
  };
}

interface LayoutRecipe {
  /** Share of the safe area's height the block occupies, and where it starts within it. */
  anchor: "top" | "middle" | "bottom";
  align: TextAlign;
  headingScale: number;
  headingWeight: number;
  bodyScale: number;
  gap: number;
  scrimOpacity: number;
}

const RECIPES: Record<LayoutName, LayoutRecipe> = {
  cover: {
    anchor: "middle",
    align: "center",
    headingScale: 0.115,
    headingWeight: 800,
    bodyScale: 0.042,
    gap: 40,
    scrimOpacity: 0.45,
  },
  statement: {
    anchor: "bottom",
    align: "left",
    headingScale: 0.085,
    headingWeight: 700,
    bodyScale: 0.04,
    gap: 32,
    scrimOpacity: 0.4,
  },
  list: {
    anchor: "top",
    align: "left",
    headingScale: 0.062,
    headingWeight: 700,
    bodyScale: 0.038,
    gap: 36,
    scrimOpacity: 0.5,
  },
  quote: {
    anchor: "middle",
    align: "center",
    headingScale: 0.075,
    headingWeight: 600,
    bodyScale: 0.034,
    gap: 44,
    scrimOpacity: 0.5,
  },
  cta: {
    anchor: "bottom",
    align: "center",
    headingScale: 0.09,
    headingWeight: 800,
    bodyScale: 0.042,
    gap: 32,
    scrimOpacity: 0.45,
  },
};

const HEADING_LINE_HEIGHT = 1.12;
const BODY_LINE_HEIGHT = 1.4;

export function expandLayout(name: LayoutName, input: LayoutInput): DesignDocument["layers"] {
  const recipe = RECIPES[name];
  const area = safeArea(input.spec);
  const headline = input.headline?.trim() ?? "";
  const body = input.body?.trim() ?? "";

  const layers: Layer[] = [];
  const blocks: { height: number; build: (y: number) => Layer }[] = [];

  if (headline) {
    const max = Math.round(input.spec.width * recipe.headingScale);
    const fitted = fitFontSize(
      headline,
      { ...area, height: area.height * 0.55 },
      { max, min: Math.round(max * 0.5), lineHeight: HEADING_LINE_HEIGHT },
    );
    const height = Math.ceil(fitted.lines * fitted.fontSize * HEADING_LINE_HEIGHT);

    blocks.push({
      height,
      build: (y) =>
        textLayer("heading", { ...area, y, height }, headline, {
          role: "heading",
          fontFamily: input.fonts.heading,
          fontSize: fitted.fontSize,
          fontWeight: recipe.headingWeight,
          lineHeight: HEADING_LINE_HEIGHT,
          align: recipe.align,
          color: input.colors.heading,
        }),
    });
  }

  if (body) {
    const max = Math.round(input.spec.width * recipe.bodyScale);
    const fitted = fitFontSize(
      body,
      { ...area, height: area.height * 0.4 },
      { max, min: Math.round(max * 0.6), lineHeight: BODY_LINE_HEIGHT },
    );
    const height = Math.ceil(fitted.lines * fitted.fontSize * BODY_LINE_HEIGHT);

    blocks.push({
      height,
      build: (y) =>
        textLayer("body", { ...area, y, height }, body, {
          role: "body",
          fontFamily: input.fonts.body,
          fontSize: fitted.fontSize,
          fontWeight: 400,
          lineHeight: BODY_LINE_HEIGHT,
          align: recipe.align,
          color: input.colors.body,
        }),
    });
  }

  if (blocks.length === 0) return layers;

  const totalHeight =
    blocks.reduce((sum, block) => sum + block.height, 0) + recipe.gap * (blocks.length - 1);
  const overflow = Math.max(0, totalHeight - area.height);

  let y: number;
  if (recipe.anchor === "top") {
    y = area.y;
  } else if (recipe.anchor === "middle") {
    y = area.y + Math.max(0, (area.height - totalHeight) / 2);
  } else {
    y = area.y + Math.max(0, area.height - totalHeight);
  }

  for (const block of blocks) {
    layers.push(block.build(Math.round(y)));
    y += block.height + recipe.gap;
  }

  return overflow > 0 ? shrinkToFit(layers, area) : layers;
}

/**
 * The estimator can still overshoot on a long headline and a long body together. Rather than
 * open the editor with text outside the frame, scale the whole stack down around the top of
 * the safe area.
 */
function shrinkToFit(layers: Layer[], area: Box): Layer[] {
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
  const used = bottom - area.y;
  if (used <= area.height) return layers;

  const scale = area.height / used;

  return layers.map((layer) => {
    const scaled = {
      ...layer,
      y: Math.round(area.y + (layer.y - area.y) * scale),
      height: Math.round(layer.height * scale),
    };
    return scaled.type === "text"
      ? { ...scaled, fontSize: Math.max(8, Math.round(scaled.fontSize * scale)) }
      : scaled;
  });
}

export function layoutOverlay(name: LayoutName, colors: LayoutColors): DesignDocument["overlay"] {
  return { color: colors.scrim, opacity: RECIPES[name].scrimOpacity };
}
