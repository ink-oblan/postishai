import { type Box, type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type {
  AutoLayout,
  DesignDocument,
  Layer,
  StackAnchor,
  TextAlign,
  TextLayer,
} from "@/lib/design/document";
import { stackStart } from "@/lib/design/reflow";

export const LAYOUT_NAMES = ["cover", "statement", "list", "quote", "cta"] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

export const DEFAULT_LAYOUT: LayoutName = "statement";

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  cover: "Cover",
  statement: "Statement",
  list: "List",
  quote: "Quote",
  cta: "Call to action",
};

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
    italic: false,
    underline: false,
    lineThrough: false,
    ...options,
  };
}

interface LayoutRecipe {
  /** Share of the safe area's height the block occupies, and where it starts within it. */
  anchor: StackAnchor;
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

export const HEADING_LINE_HEIGHT = 1.12;
export const BODY_LINE_HEIGHT = 1.4;
const BODY_FONT_WEIGHT = 400;

export function expandLayout(name: LayoutName, input: LayoutInput): DesignDocument["layers"] {
  const recipe = RECIPES[name];
  const area = safeArea(input.spec);
  const headline = input.headline?.trim() ?? "";
  const body = input.body?.trim() ?? "";

  const layers: Layer[] = [];
  const blocks: { height: number; build: (y: number) => Layer }[] = [];

  const roles = [
    {
      role: "heading" as const,
      text: headline,
      scale: recipe.headingScale,
      minRatio: 0.5,
      // The headline may claim more of the safe area than the body, so they are fitted apart.
      areaFraction: 0.55,
      lineHeight: HEADING_LINE_HEIGHT,
      fontWeight: recipe.headingWeight,
      fontFamily: input.fonts.heading,
      color: input.colors.heading,
    },
    {
      role: "body" as const,
      text: body,
      scale: recipe.bodyScale,
      minRatio: 0.6,
      areaFraction: 0.4,
      lineHeight: BODY_LINE_HEIGHT,
      fontWeight: BODY_FONT_WEIGHT,
      fontFamily: input.fonts.body,
      color: input.colors.body,
    },
  ];

  for (const role of roles) {
    if (!role.text) continue;

    const max = Math.round(input.spec.width * role.scale);
    const fitted = fitFontSize(
      role.text,
      { ...area, height: area.height * role.areaFraction },
      { max, min: Math.round(max * role.minRatio), lineHeight: role.lineHeight },
    );
    const height = Math.ceil(fitted.lines * fitted.fontSize * role.lineHeight);

    blocks.push({
      height,
      build: (y) =>
        textLayer(role.role, { ...area, y, height }, role.text, {
          role: role.role,
          fontFamily: role.fontFamily,
          fontSize: fitted.fontSize,
          fontWeight: role.fontWeight,
          lineHeight: role.lineHeight,
          align: recipe.align,
          color: role.color,
        }),
    });
  }

  if (blocks.length === 0) return layers;

  const totalHeight =
    blocks.reduce((sum, block) => sum + block.height, 0) + recipe.gap * (blocks.length - 1);
  const overflow = Math.max(0, totalHeight - area.height);

  let y = stackStart(recipe.anchor, area, totalHeight);

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

/** The part of the recipe the browser needs to restack the blocks against real font metrics. */
export function layoutAutoLayout(name: LayoutName): AutoLayout {
  const { anchor, gap } = RECIPES[name];
  return { anchor, gap };
}
