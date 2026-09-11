"use client";

import type Konva from "konva";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import { ensureFontsLoaded, facesUsedBy, remeasureText } from "@/lib/design/fonts";
import { BACKGROUND_NODE_NAME, EDITOR_CHROME_NAME } from "./DesignStage";

/**
 * The background is loaded asynchronously by the stage, so switching slides and exporting in
 * the same tick would rasterise whatever was on screen before — a slide with no photograph.
 */
export async function waitForBackground(
  stage: Konva.Stage,
  expectedUrl: string | null,
  timeoutMs = 15_000,
): Promise<void> {
  if (!expectedUrl) return;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const node = stage.findOne<Konva.Image>(`.${BACKGROUND_NODE_NAME}`);
    const src =
      node?.image() instanceof HTMLImageElement ? (node.image() as HTMLImageElement).src : null;
    if (
      src &&
      new URL(src, window.location.origin).href ===
        new URL(expectedUrl, window.location.origin).href
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("The slide background did not finish loading");
}

/**
 * The stage is drawn scaled to fit the viewport, so exporting at the canvas's true size means
 * undoing that scale — `pixelRatio` is what turns a 420px-wide preview back into 1080px.
 */
export async function rasterizeStage(
  stage: Konva.Stage,
  document: DesignDocument,
  spec: CanvasSpec,
  resolveFontFamily?: (name: string) => string,
): Promise<Blob> {
  await ensureFontsLoaded(facesUsedBy(document, resolveFontFamily));

  // Selection handles and the safe-zone guide belong to the editor, not to the exported image.
  const chrome = stage.find(`.${EDITOR_CHROME_NAME}`);
  const wasVisible = chrome.map((node) => node.visible());
  for (const node of chrome) node.visible(false);

  try {
    // Redraw after the fonts land, or the export keeps whatever fallback was measured first.
    remeasureText(stage);
    stage.draw();

    const pixelRatio = spec.width / stage.width();
    const dataUrl = stage.toDataURL({ mimeType: "image/png", pixelRatio });
    const response = await fetch(dataUrl);
    return await response.blob();
  } finally {
    chrome.forEach((node, index) => {
      node.visible(wasVisible[index]);
    });
    stage.draw();
  }
}
