"use client";

import type Konva from "konva";
import { rasterizeStage, waitForBackground } from "@/components/design/rasterize";
import type { PageDocuments } from "@/components/design/useDesignEditor";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import { EMPTY_DOCUMENT } from "@/lib/design/document";

/** Two frames: one for React to commit the new document, one for Konva to draw it. */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export interface ExportedPage {
  pageId: string;
  blob: Blob;
}

export interface ExportPagesOptions {
  pageIds: string[];
  /** Read per page: the stage only exists once the dynamic import has landed. */
  stage: () => Konva.Stage | null;
  spec: CanvasSpec;
  /** Read at call time, so a page edited moments ago exports its latest document. */
  documents: () => PageDocuments;
  backgroundUrl: (pageId: string) => string | null;
  openPage: (pageId: string) => void;
  assets: { resolveFontFamily?: (name: string) => string; assetUrl: (assetId: string) => string };
  onProgress?: (current: number, total: number) => void;
}

/**
 * Every page has to be drawn to export it, and only one stage exists — so each page is opened
 * in turn and rasterised once the stage has actually rendered it.
 */
export async function exportPages({
  pageIds,
  stage,
  spec,
  documents,
  backgroundUrl,
  openPage,
  assets,
  onProgress,
}: ExportPagesOptions): Promise<ExportedPage[]> {
  const rendered: ExportedPage[] = [];

  for (const [index, pageId] of pageIds.entries()) {
    onProgress?.(index + 1, pageIds.length);
    openPage(pageId);
    const document = documents()[pageId] ?? EMPTY_DOCUMENT;
    await nextPaint();

    const current = stage();
    if (!current) throw new Error("The editor canvas is not ready");

    await waitForBackground(current, backgroundUrl(pageId));
    rendered.push({ pageId, blob: await rasterizeStage(current, document, spec, assets) });
  }

  return rendered;
}
