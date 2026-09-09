"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer, TextLayer } from "@/lib/design/document";

const MAX_HISTORY = 50;

function newLayerId(): string {
  return `layer-${Math.random().toString(36).slice(2, 10)}`;
}

export interface DesignEditorState {
  document: DesignDocument;
  selectedId: string | null;
  dirty: boolean;
  canUndo: boolean;
  select: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  /** Same as `updateLayer` but folded into the previous entry, for drag and transform streams. */
  commitLayer: (id: string, patch: Partial<Layer>) => void;
  addTextLayer: (role: TextLayer["role"], fontFamily: string, color: string) => void;
  addShapeLayer: (fill: string) => void;
  addLogoLayer: (assetId: string) => void;
  deleteLayer: (id: string) => void;
  raiseLayer: (id: string) => void;
  lowerLayer: (id: string) => void;
  setDocument: (next: DesignDocument, options?: { markClean?: boolean }) => void;
  undo: () => void;
  markClean: () => void;
}

export function useDesignEditor(initial: DesignDocument, spec: CanvasSpec): DesignEditorState {
  const [document, setDocumentState] = useState<DesignDocument>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<DesignDocument[]>([]);
  const [dirty, setDirty] = useState(false);
  const area = useMemo(() => safeArea(spec), [spec]);

  // Set while a drag or transform is streaming, so the whole gesture collapses to one undo step.
  const coalescing = useRef(false);

  const mutate = useCallback(
    (change: (doc: DesignDocument) => DesignDocument, coalesce: boolean) => {
      setDocumentState((current) => {
        if (!coalesce || !coalescing.current) {
          setHistory((past) => [...past, current].slice(-MAX_HISTORY));
        }
        coalescing.current = coalesce;
        return change(current);
      });
      setDirty(true);
    },
    [],
  );

  const patchLayer = useCallback(
    (id: string, patch: Partial<Layer>, coalesce: boolean) => {
      mutate(
        (doc) => ({
          ...doc,
          layers: doc.layers.map((layer) =>
            layer.id === id ? ({ ...layer, ...patch } as Layer) : layer,
          ),
        }),
        coalesce,
      );
    },
    [mutate],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      coalescing.current = false;
      patchLayer(id, patch, false);
    },
    [patchLayer],
  );

  const commitLayer = useCallback(
    (id: string, patch: Partial<Layer>) => patchLayer(id, patch, true),
    [patchLayer],
  );

  const append = useCallback(
    (layer: Layer) => {
      coalescing.current = false;
      mutate((doc) => ({ ...doc, layers: [...doc.layers, layer] }), false);
      setSelectedId(layer.id);
    },
    [mutate],
  );

  const addTextLayer = useCallback(
    (role: TextLayer["role"], fontFamily: string, color: string) => {
      const fontSize =
        role === "heading" ? Math.round(spec.width * 0.075) : Math.round(spec.width * 0.038);
      append({
        id: newLayerId(),
        type: "text",
        x: area.x,
        y: area.y + area.height / 2,
        width: area.width,
        height: Math.round(fontSize * 1.4 * 2),
        rotation: 0,
        text: role === "heading" ? "New heading" : "New text",
        role,
        fontFamily,
        fontSize,
        fontWeight: role === "heading" ? 700 : 400,
        lineHeight: role === "heading" ? 1.12 : 1.4,
        align: "left",
        color,
      });
    },
    [append, area, spec.width],
  );

  const addShapeLayer = useCallback(
    (fill: string) => {
      append({
        id: newLayerId(),
        type: "shape",
        x: area.x,
        y: area.y + area.height / 2,
        width: area.width,
        height: Math.round(area.height / 4),
        rotation: 0,
        fill,
        cornerRadius: 16,
        opacity: 0.6,
      });
    },
    [append, area],
  );

  const addLogoLayer = useCallback(
    (assetId: string) => {
      const size = Math.round(spec.width * 0.16);
      append({
        id: newLayerId(),
        type: "logo",
        x: area.x,
        y: area.y,
        width: size,
        height: size,
        rotation: 0,
        assetId,
      });
    },
    [append, area, spec.width],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      coalescing.current = false;
      mutate((doc) => ({ ...doc, layers: doc.layers.filter((layer) => layer.id !== id) }), false);
      setSelectedId((current) => (current === id ? null : current));
    },
    [mutate],
  );

  const reorder = useCallback(
    (id: string, direction: 1 | -1) => {
      coalescing.current = false;
      mutate((doc) => {
        const index = doc.layers.findIndex((layer) => layer.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= doc.layers.length) return doc;

        const layers = [...doc.layers];
        [layers[index], layers[target]] = [layers[target], layers[index]];
        return { ...doc, layers };
      }, false);
    },
    [mutate],
  );

  const undo = useCallback(() => {
    coalescing.current = false;
    setHistory((past) => {
      if (past.length === 0) return past;
      setDocumentState(past[past.length - 1]);
      setDirty(true);
      return past.slice(0, -1);
    });
  }, []);

  const setDocument = useCallback((next: DesignDocument, options?: { markClean?: boolean }) => {
    coalescing.current = false;
    setDocumentState(next);
    if (options?.markClean) {
      setHistory([]);
      setDirty(false);
    }
  }, []);

  const raiseLayer = useCallback((id: string) => reorder(id, 1), [reorder]);
  const lowerLayer = useCallback((id: string) => reorder(id, -1), [reorder]);
  const markClean = useCallback(() => setDirty(false), []);

  return {
    document,
    selectedId,
    dirty,
    canUndo: history.length > 0,
    select: setSelectedId,
    updateLayer,
    commitLayer,
    addTextLayer,
    addShapeLayer,
    addLogoLayer,
    deleteLayer,
    raiseLayer,
    lowerLayer,
    setDocument,
    undo,
    markClean,
  };
}
