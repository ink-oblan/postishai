import { type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import { type LayoutName, layoutNominalFontSizes } from "@/lib/design/layouts";
import type { MeasureText } from "@/lib/design/reflow";

const SHRINK_THRESHOLD = 0.8;

export interface FitReport {
  shrunk: boolean;
  overflowing: boolean;
}

export function fitReport(options: {
  document: DesignDocument;
  layout: LayoutName;
  spec: CanvasSpec;
  measure: MeasureText;
}): FitReport {
  const { document, layout, spec, measure } = options;
  const area = safeArea(spec);
  const nominal = layoutNominalFontSizes(layout, spec);
  const gap = document.autoLayout?.gap ?? 0;

  const blocks = document.layers.flatMap((layer) => (layer.type === "text" ? [layer] : []));
  if (blocks.length === 0) return { shrunk: false, overflowing: false };

  const stacked =
    blocks.reduce((total, block) => total + measure(block), 0) + gap * (blocks.length - 1);

  return {
    shrunk: blocks.some((block) => block.fontSize < nominal[block.role] * SHRINK_THRESHOLD),
    overflowing: stacked > area.height,
  };
}
