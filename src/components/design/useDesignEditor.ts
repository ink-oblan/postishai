"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer, TextLayer } from "@/lib/design/document";

const MAX_HISTORY = 50;
const DUPLICATE_OFFSET = 24;

function newLayerId(): string {
  return `layer-${Math.random().toString(36).slice(2, 10)}`;
}

interface HistoryState {
  document: DesignDocument;
  past: DesignDocument[];
  future: DesignDocument[];
  dirty: boolean;
  /** True while a drag, transform or nudge run is streaming, so the gesture is one undo step. */
  coalescing: boolean;
}

type HistoryAction =
  | { type: "change"; change: (doc: DesignDocument) => DesignDocument; coalesce: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "endGesture" }
  | { type: "reset"; document: DesignDocument; markClean: boolean }
  | { type: "markClean" };

function initialState(document: DesignDocument): HistoryState {
  return { document, past: [], future: [], dirty: false, coalescing: false };
}

function reduce(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "change": {
      const fold = action.coalesce && state.coalescing;
      return {
        document: action.change(state.document),
        past: fold ? state.past : [...state.past, state.document].slice(-MAX_HISTORY),
        future: [],
        dirty: true,
        coalescing: action.coalesce,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      return {
        document: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [...state.future, state.document].slice(-MAX_HISTORY),
        dirty: true,
        coalescing: false,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      return {
        document: state.future[state.future.length - 1],
        past: [...state.past, state.document].slice(-MAX_HISTORY),
        future: state.future.slice(0, -1),
        dirty: true,
        coalescing: false,
      };
    }
    case "endGesture":
      return state.coalescing ? { ...state, coalescing: false } : state;
    case "reset":
      return action.markClean
        ? initialState(action.document)
        : { ...state, document: action.document, coalescing: false };
    case "markClean":
      return state.dirty ? { ...state, dirty: false } : state;
  }
}

export interface DesignEditorState {
  document: DesignDocument;
  selectedId: string | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  select: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  /** Same as `updateLayer` but folded into the previous entry, for drag and transform streams. */
  commitLayer: (id: string, patch: Partial<Layer>) => void;
  /** Moves a layer by a delta, folding a run of moves into a single undo step. */
  nudgeLayer: (id: string, dx: number, dy: number) => void;
  /** Ends a coalesced run so the next change starts a fresh undo step. */
  endGesture: () => void;
  addTextLayer: (role: TextLayer["role"], fontFamily: string, color: string) => void;
  addShapeLayer: (fill: string) => void;
  addLogoLayer: (assetId: string) => void;
  duplicateLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  raiseLayer: (id: string) => void;
  lowerLayer: (id: string) => void;
  setDocument: (next: DesignDocument, options?: { markClean?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
}

export function useDesignEditor(initial: DesignDocument, spec: CanvasSpec): DesignEditorState {
  const [state, dispatch] = useReducer(reduce, initial, initialState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const area = useMemo(() => safeArea(spec), [spec]);

  const mutate = useCallback(
    (change: (doc: DesignDocument) => DesignDocument, coalesce: boolean) =>
      dispatch({ type: "change", change, coalesce }),
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
    (id: string, patch: Partial<Layer>) => patchLayer(id, patch, false),
    [patchLayer],
  );

  const commitLayer = useCallback(
    (id: string, patch: Partial<Layer>) => patchLayer(id, patch, true),
    [patchLayer],
  );

  const nudgeLayer = useCallback(
    (id: string, dx: number, dy: number) => {
      mutate(
        (doc) => ({
          ...doc,
          layers: doc.layers.map((layer) =>
            layer.id === id ? { ...layer, x: layer.x + dx, y: layer.y + dy } : layer,
          ),
        }),
        true,
      );
    },
    [mutate],
  );

  const endGesture = useCallback(() => dispatch({ type: "endGesture" }), []);

  const append = useCallback(
    (layer: Layer) => {
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

  const duplicateLayer = useCallback(
    (id: string) => {
      const copyId = newLayerId();
      mutate((doc) => {
        const index = doc.layers.findIndex((layer) => layer.id === id);
        if (index === -1) return doc;

        const copy = {
          ...doc.layers[index],
          id: copyId,
          x: doc.layers[index].x + DUPLICATE_OFFSET,
          y: doc.layers[index].y + DUPLICATE_OFFSET,
        };
        const layers = [...doc.layers];
        layers.splice(index + 1, 0, copy);
        return { ...doc, layers };
      }, false);
      setSelectedId((current) => (current === id ? copyId : current));
    },
    [mutate],
  );

  const deleteLayer = useCallback(
    (id: string) => {
      mutate((doc) => ({ ...doc, layers: doc.layers.filter((layer) => layer.id !== id) }), false);
      setSelectedId((current) => (current === id ? null : current));
    },
    [mutate],
  );

  const reorder = useCallback(
    (id: string, direction: 1 | -1) => {
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

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const setDocument = useCallback((next: DesignDocument, options?: { markClean?: boolean }) => {
    dispatch({ type: "reset", document: next, markClean: options?.markClean ?? false });
  }, []);

  const raiseLayer = useCallback((id: string) => reorder(id, 1), [reorder]);
  const lowerLayer = useCallback((id: string) => reorder(id, -1), [reorder]);
  const markClean = useCallback(() => dispatch({ type: "markClean" }), []);

  return {
    document: state.document,
    selectedId,
    dirty: state.dirty,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    select: setSelectedId,
    updateLayer,
    commitLayer,
    nudgeLayer,
    endGesture,
    addTextLayer,
    addShapeLayer,
    addLogoLayer,
    duplicateLayer,
    deleteLayer,
    raiseLayer,
    lowerLayer,
    setDocument,
    undo,
    redo,
    markClean,
  };
}
