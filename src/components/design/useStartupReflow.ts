"use client";

import { useEffect, useRef, useState } from "react";
import type { PageDocuments } from "@/components/design/useDesignEditor";
import { type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import { ensureFontsLoaded, facesUsedBy } from "@/lib/design/fonts";
import { textMeasurer } from "@/lib/design/measure-text";
import { reflowAutoLayout } from "@/lib/design/reflow";

export interface StartupReflowOptions {
  initialDocuments: PageDocuments;
  spec: CanvasSpec;
  resolveFontFamily: (name: string) => string;
  /** Registers any host-uploaded faces before the first measurement. */
  loadFonts?: () => Promise<void>;
  applyReflow: (documents: PageDocuments) => void;
  savePage: (pageId: string, document: DesignDocument) => Promise<void>;
  onError: (error: unknown) => void;
}

/**
 * The generator stacks a page's text against a guess at how the copy will wrap — it has no font
 * metrics on the server — and that guess undercounts lines for wide glyphs, which is what leaves
 * a body paragraph sitting inside the headline above it. The browser can measure the real thing,
 * so restack every generated page here and write the corrections back: doing it up front, over
 * all pages rather than just the open one, keeps preview and export reading corrected documents
 * instead of racing the editor for them.
 *
 * Returns true while editing and export stay blocked.
 * Deliberately without an abort: the ref is what keeps this to one run, and a correction that
 * lands after a remount is still worth saving. Cancelling on teardown would instead mean Strict
 * Mode's double mount aborts the only run there is.
 */
export function useStartupReflow({
  initialDocuments,
  spec,
  resolveFontFamily,
  loadFonts,
  applyReflow,
  savePage,
  onError,
}: StartupReflowOptions): boolean {
  const [preparing, setPreparing] = useState(true);
  const restacked = useRef(false);

  const latest = useRef({ resolveFontFamily, loadFonts, onError });
  latest.current = { resolveFontFamily, loadFonts, onError };

  useEffect(() => {
    if (restacked.current) return;
    restacked.current = true;

    const { resolveFontFamily: resolve, loadFonts: load, onError: report } = latest.current;

    void (async () => {
      await load?.();

      const documents = Object.entries(initialDocuments);
      await ensureFontsLoaded(documents.flatMap(([, document]) => facesUsedBy(document, resolve)));

      const measure = textMeasurer(resolve);
      const area = safeArea(spec);
      const corrected: PageDocuments = {};
      for (const [id, document] of documents) {
        const next = reflowAutoLayout(document, area, measure);
        if (next) corrected[id] = next;
      }
      if (Object.keys(corrected).length === 0) return;

      applyReflow(corrected);

      // Best effort: a page that fails to save is simply restacked again on the next visit.
      await Promise.all(
        Object.entries(corrected).map(([id, document]) => savePage(id, document).catch(() => {})),
      );
    })()
      .catch(report)
      .finally(() => setPreparing(false));
  }, [applyReflow, initialDocuments, savePage, spec]);

  return preparing;
}
