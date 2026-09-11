import type { Layer, ShapeLayer, TextLayer } from "@/lib/design/document";

type TextStyle = Pick<
  TextLayer,
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "italic"
  | "underline"
  | "lineThrough"
  | "lineHeight"
  | "align"
  | "color"
>;
type ShapeStyle = Pick<ShapeLayer, "fill" | "cornerRadius" | "opacity">;

interface CopiedStyle {
  type: Layer["type"];
  properties: TextStyle | ShapeStyle;
}

/**
 * Module scoped rather than editor state: the editor swaps its whole document when the slide
 * changes, and copying a layer from one slide onto another is the point of having a clipboard.
 */
let copiedLayer: Layer | null = null;
let copiedStyle: CopiedStyle | null = null;

export function copyLayer(layer: Layer): void {
  copiedLayer = layer;
}

export function readCopiedLayer(): Layer | null {
  return copiedLayer;
}

function styleOf(layer: Layer): TextStyle | ShapeStyle | null {
  if (layer.type === "text") {
    const { fontFamily, fontSize, fontWeight, italic, underline, lineThrough } = layer;
    const { lineHeight, align, color } = layer;
    return {
      fontFamily,
      fontSize,
      fontWeight,
      italic,
      underline,
      lineThrough,
      lineHeight,
      align,
      color,
    };
  }
  if (layer.type === "shape") {
    const { fill, cornerRadius, opacity } = layer;
    return { fill, cornerRadius, opacity };
  }

  // A logo carries no styling of its own — the asset is the whole layer.
  return null;
}

/** Copies the look of a layer without its content or geometry. Returns false when it has none. */
export function copyLayerStyle(layer: Layer): boolean {
  const properties = styleOf(layer);
  if (!properties) return false;

  copiedStyle = { type: layer.type, properties };
  return true;
}

/** Only hands the style back for the kind of layer it came from, so a paste never half-applies. */
export function readCopiedStyle(type: Layer["type"]): Partial<Layer> | null {
  return copiedStyle && copiedStyle.type === type ? copiedStyle.properties : null;
}
