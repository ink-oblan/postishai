"use client";

import { useCallback, useRef, useState } from "react";
import { sampleBackgroundRegion } from "@/components/design/sample-background";
import type { DesignEditorState, PageDocuments } from "@/components/design/useDesignEditor";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import { type DesignDocument, EMPTY_DOCUMENT, type TextBackground } from "@/lib/design/document";
import {
  defaultTextPlate,
  inferPlateColor,
  platedRegion,
  platePaddingForGap,
  textColorsOf,
  withTextPlates,
} from "@/lib/design/plate";

export interface PlateOptions {
  pageIds: string[];
  backgroundUrl: (pageId: string) => string | null;
  spec: CanvasSpec;
  enabled: boolean;
  /**
   * Shared with the export run: replating and exporting both walk every page, so one has to
   * wait for the other. A ref rather than state, because both can be fired in the same tick.
   */
  operation: React.RefObject<boolean>;
  onError: (error: unknown) => void;
  onApplied?: (adding: boolean) => void;
}

export interface Plate {
  /** True while every page is being replated, which blocks the editor. */
  pending: boolean;
  /** Turns the selected layer's plate on or off, reading its colour off the photo behind it. */
  toggle: (on: boolean) => Promise<void>;
  applyToAll: (adding: boolean) => Promise<void>;
}

/**
 * A plate colour is per page, not per document set: it is read off the photograph behind that
 * page's own copy, so each one gets a band that belongs to its picture. A page still waiting on
 * its background has nothing to read, and falls back to the neutral plate.
 */
export function usePlate(
  editor: DesignEditorState,
  { pageIds, backgroundUrl, spec, enabled, operation, onError, onApplied }: PlateOptions,
): Plate {
  const [pending, setPending] = useState(false);

  const editorRef = useRef(editor);
  editorRef.current = editor;

  const inferFor = useCallback(
    async (pageId: string, document: DesignDocument): Promise<TextBackground> => {
      const url = backgroundUrl(pageId);
      const region = platedRegion(document);
      const textColors = textColorsOf(document);
      if (!url || !region || textColors.length === 0) return defaultTextPlate();

      try {
        const sample = await sampleBackgroundRegion(url, spec, region);
        if (!sample) return defaultTextPlate();
        return defaultTextPlate(inferPlateColor({ sample, textColors }));
      } catch {
        return defaultTextPlate();
      }
    },
    [backgroundUrl, spec],
  );

  const toggle = useCallback(
    async (on: boolean) => {
      const current = editorRef.current;
      const id = current.selectedId;
      if (!id) return;
      if (!on) {
        current.updateLayer(id, { background: undefined });
        return;
      }

      const plate = current.pageId
        ? await inferFor(current.pageId, current.document)
        : defaultTextPlate();
      const padding = current.document.autoLayout
        ? platePaddingForGap(current.document.autoLayout.gap)
        : plate.padding;

      editorRef.current.updateLayer(id, { background: { ...plate, padding } });
    },
    [inferFor],
  );

  const applyToAll = useCallback(
    async (adding: boolean) => {
      if (!enabled || operation.current) return;
      operation.current = true;
      setPending(true);
      try {
        const documents = Object.fromEntries(
          await Promise.all(
            pageIds.map(async (pageId): Promise<[string, DesignDocument]> => {
              const document = editorRef.current.documents[pageId] ?? EMPTY_DOCUMENT;
              const plate = adding ? await inferFor(pageId, document) : null;
              return [pageId, withTextPlates(document, plate)];
            }),
          ),
        );

        editorRef.current.restylePages(documents as PageDocuments);
        onApplied?.(adding);
      } catch (err) {
        onError(err);
      } finally {
        setPending(false);
        operation.current = false;
      }
    },
    [inferFor, enabled, operation, pageIds, onError, onApplied],
  );

  return { pending, toggle, applyToAll };
}
