"use client";

import Konva from "konva";
import { fontStyleOf, type TextLayer, textDecorationOf } from "@/lib/design/document";
import type { MeasureText } from "@/lib/design/reflow";

/**
 * One detached node does all the measuring. Konva works the wrap out in `setAttrs`, so reading
 * `height()` straight afterwards gives the height the stage would draw — no stage required, and
 * no garbage per layer. The attributes below must stay in step with what `DesignStage` renders,
 * or the measurement describes a slide nobody sees.
 */
let ruler: Konva.Text | null = null;

export function measureTextHeight(
  layer: TextLayer,
  resolveFontFamily: (name: string) => string,
): number {
  ruler ??= new Konva.Text({});

  ruler.setAttrs({
    text: layer.text,
    width: layer.width,
    fontFamily: resolveFontFamily(layer.fontFamily),
    fontSize: layer.fontSize,
    fontStyle: fontStyleOf(layer),
    textDecoration: textDecorationOf(layer),
    lineHeight: layer.lineHeight,
    align: layer.align,
    wrap: "word",
  });

  return ruler.height();
}

export function textMeasurer(resolveFontFamily: (name: string) => string): MeasureText {
  return (layer) => measureTextHeight(layer, resolveFontFamily);
}
