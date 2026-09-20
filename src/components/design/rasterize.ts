"use client";

import type Konva from "konva";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import { brandAssetUrl, ensureFontsLoaded, facesUsedBy, remeasureText } from "@/lib/design/fonts";
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

function exportBox(stage: Konva.Stage) {
  return { x: 0, y: 0, width: stage.width(), height: stage.height() };
}

function atExactSize(source: HTMLCanvasElement, spec: CanvasSpec): HTMLCanvasElement {
  if (source.width === spec.width && source.height === spec.height) return source;

  const exact = window.document.createElement("canvas");
  exact.width = spec.width;
  exact.height = spec.height;
  exact.getContext("2d")?.drawImage(source, 0, 0, spec.width, spec.height);

  return exact;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The slide could not be encoded"));
    }, mimeType);
  });
}

/** Wait for the image attached to each logo node, not merely a prefetched CDN response. */
export async function waitForLogos(
  stage: Konva.Stage,
  document: DesignDocument,
  timeoutMs = 15_000,
): Promise<void> {
  const logos = document.layers.filter((layer) => layer.type === "logo");
  if (logos.length === 0) return;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let ready = true;
    for (const logo of logos) {
      const node = stage.findOne<Konva.Image>(
        (candidate: Konva.Node) => candidate.id() === logo.id,
      );
      if (node?.getAttr("imageLoadStatus") === "error") {
        throw new Error("A slide logo failed to load. Check the brand asset and try again.");
      }
      const image = typeof node?.image === "function" ? node.image() : null;
      if (
        !(image instanceof HTMLImageElement) ||
        !image.complete ||
        image.naturalWidth === 0 ||
        new URL(image.src, window.location.origin).href !==
          new URL(brandAssetUrl(logo.assetId), window.location.origin).href
      ) {
        ready = false;
      }
    }
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The slide logos did not finish loading");
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
  await Promise.all([
    ensureFontsLoaded(facesUsedBy(document, resolveFontFamily)),
    waitForLogos(stage, document),
  ]);

  // Selection handles and the safe-zone guide belong to the editor, not to the exported image.
  const chrome = stage.find(`.${EDITOR_CHROME_NAME}`);
  const wasVisible = chrome.map((node) => node.visible());
  for (const node of chrome) node.visible(false);

  try {
    // Redraw after the fonts land, or the export keeps whatever fallback was measured first.
    remeasureText(stage);
    stage.draw();

    const pixelRatio = spec.width / stage.width();
    const rendered = stage.toCanvas({ ...exportBox(stage), pixelRatio });

    return await canvasToBlob(atExactSize(rendered, spec), "image/png");
  } finally {
    chrome.forEach((node, index) => {
      node.visible(wasVisible[index]);
    });
    stage.draw();
  }
}
