import type { Box } from "@/lib/design/canvas-spec";
import type { AutoLayout, DesignDocument, Layer, TextLayer } from "@/lib/design/document";

/** The height a text layer actually draws at, once its copy is wrapped by the real font. */
export type MeasureText = (layer: TextLayer) => number;

const MIN_FONT_SIZE = 8;

/**
 * Shrinking changes the wrap, which changes the height, which changes how much shrinking is
 * needed — so the fit is found by iterating rather than by one division. In practice it settles
 * in two or three passes; the cap is only there so a pathological case cannot spin.
 */
const MAX_SHRINK_PASSES = 8;

function stackedHeight(heights: number[], gap: number): number {
  return heights.reduce((sum, height) => sum + height, 0) + gap * (heights.length - 1);
}

function stackStart(anchor: AutoLayout["anchor"], area: Box, total: number): number {
  switch (anchor) {
    case "top":
      return area.y;
    case "middle":
      return area.y + Math.max(0, (area.height - total) / 2);
    case "bottom":
      return area.y + Math.max(0, area.height - total);
  }
}

function place(
  blocks: TextLayer[],
  heights: number[],
  area: Box,
  { anchor, gap }: AutoLayout,
): TextLayer[] {
  let y = stackStart(anchor, area, stackedHeight(heights, gap));

  return blocks.map((block, index) => {
    const placed = { ...block, y: Math.round(y), height: Math.ceil(heights[index]) };
    y += heights[index] + gap;
    return placed;
  });
}

function sameLayout(before: Layer[], after: Layer[]): boolean {
  return before.every((layer, index) => {
    const next = after[index];
    return (
      layer.y === next.y &&
      layer.height === next.height &&
      (layer.type !== "text" || next.type !== "text" || layer.fontSize === next.fontSize)
    );
  });
}

/**
 * Re-stacks a generated slide's text against measurements taken from the font that will actually
 * draw it. The server lays these blocks out against a character-count estimate, which undercounts
 * lines for wide glyphs and leaves the body sitting inside the headline; this is where that gets
 * corrected. Returns `null` when the document is already right, or is not ours to touch.
 */
export function reflowAutoLayout(
  document: DesignDocument,
  area: Box,
  measure: MeasureText,
): DesignDocument | null {
  const autoLayout = document.autoLayout;
  if (!autoLayout || document.layers.length === 0) return null;

  // Anything other than the generated text blocks means the layout has been taken over by hand.
  if (document.layers.some((layer) => layer.type !== "text")) return null;

  let blocks = document.layers as TextLayer[];
  let heights = blocks.map(measure);

  for (let pass = 0; pass < MAX_SHRINK_PASSES; pass++) {
    const total = stackedHeight(heights, autoLayout.gap);
    if (total <= area.height) break;

    const scale = area.height / total;
    // Rounded down, never to nearest: rounding a shrink up can leave the stack still overflowing
    // by a hair, and the pass after it computes the same size again and gives up on the spot.
    const shrunk = blocks.map((block) => ({
      ...block,
      fontSize: Math.max(MIN_FONT_SIZE, Math.floor(block.fontSize * scale)),
    }));
    // Every block is already at the floor, so another pass would measure the same thing.
    if (shrunk.every((block, index) => block.fontSize === blocks[index].fontSize)) break;

    blocks = shrunk;
    heights = blocks.map(measure);
  }

  const layers = place(blocks, heights, area, autoLayout);

  return sameLayout(document.layers, layers) ? null : { ...document, layers };
}
