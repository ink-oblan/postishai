"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { type Box, type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import {
  BOLD_WEIGHT,
  type DesignDocument,
  type Layer,
  REGULAR_WEIGHT,
  type TextLayer,
} from "@/lib/design/document";
import { BODY_LINE_HEIGHT, HEADING_LINE_HEIGHT } from "@/lib/design/layouts";

const MAX_HISTORY = 50;
const DUPLICATE_OFFSET = 24;
const MAX_PASTE_STEPS = 12;

/** Sizes for a layer added by hand, as a share of the canvas width. */
const NEW_HEADING_SCALE = 0.075;
const NEW_BODY_SCALE = 0.038;

function newLayerId(): string {
  return `layer-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A paste keeps the copied position — that is what carries a layer to the same spot on another
 * slide — unless something already sits exactly there, in which case it steps clear so the new
 * copy is visible rather than hiding under the old one. Repeated pastes keep stepping.
 */
function freeSpot(layers: Layer[], from: Layer): { x: number; y: number } {
  let { x, y } = from;

  for (let step = 0; step < MAX_PASTE_STEPS; step++) {
    if (!layers.some((layer) => layer.x === x && layer.y === y)) break;
    x += DUPLICATE_OFFSET;
    y += DUPLICATE_OFFSET;
  }

  return { x, y };
}

export type AlignEdge = "left" | "right" | "top" | "bottom" | "centerX" | "centerY";

/**
 * Alignment targets the safe area rather than the whole canvas: it is the box the slide's copy
 * has to live inside, and it is the guide already drawn on the stage.
 */
function alignedPosition(layer: Layer, area: Box, edge: AlignEdge): { x: number } | { y: number } {
  switch (edge) {
    case "left":
      return { x: Math.round(area.x) };
    case "right":
      return { x: Math.round(area.x + area.width - layer.width) };
    case "centerX":
      return { x: Math.round(area.x + (area.width - layer.width) / 2) };
    case "top":
      return { y: Math.round(area.y) };
    case "bottom":
      return { y: Math.round(area.y + area.height - layer.height) };
    case "centerY":
      return { y: Math.round(area.y + (area.height - layer.height) / 2) };
  }
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
  | {
      type: "change";
      change: (doc: DesignDocument) => DesignDocument;
      coalesce: boolean;
      /** Set by edits that leave the generated stack's shape alone, such as recolouring. */
      keepAutoLayout?: boolean;
    }
  | { type: "reflow"; document: DesignDocument }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "endGesture" }
  | { type: "reset"; document: DesignDocument; markClean: boolean }
  | { type: "markClean" };

function initialState(document: DesignDocument): HistoryState {
  return { document, past: [], future: [], dirty: false, coalescing: false };
}

/** Geometry the generator owns — touching any of it by hand ends the automatic stacking. */
const STACK_KEYS = ["x", "y", "width", "height", "rotation"] as const;

function movesLayer(patch: Partial<Layer>): boolean {
  return STACK_KEYS.some((key) => key in patch);
}

function withoutAutoLayout(document: DesignDocument): DesignDocument {
  if (!document.autoLayout) return document;

  const { autoLayout: _dropped, ...rest } = document;
  return rest;
}

function reduce(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "change": {
      const fold = action.coalesce && state.coalescing;
      const changed = action.change(state.document);
      return {
        document: action.keepAutoLayout ? changed : withoutAutoLayout(changed),
        past: fold ? state.past : [...state.past, state.document].slice(-MAX_HISTORY),
        future: [],
        dirty: true,
        coalescing: action.coalesce,
      };
    }
    /**
     * A correction to a generated layout rather than an edit of the user's: it stays out of the
     * history, because undoing back into overlapping text is not something anyone asks for.
     */
    case "reflow":
      return { ...state, document: action.document };
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
  /** Drops a copied layer in under a fresh id, in place unless a position is given. */
  pasteLayer: (layer: Layer, at?: { x: number; y: number }) => void;
  alignLayer: (id: string, edge: AlignEdge) => void;
  duplicateLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  raiseLayer: (id: string) => void;
  lowerLayer: (id: string) => void;
  setDocument: (next: DesignDocument, options?: { markClean?: boolean }) => void;
  /** Swaps in a restacked generated layout without touching history or the dirty flag. */
  applyReflow: (next: DesignDocument) => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
}

export function useDesignEditor(initial: DesignDocument, spec: CanvasSpec): DesignEditorState {
  const [state, dispatch] = useReducer(reduce, initial, initialState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const area = useMemo(() => safeArea(spec), [spec]);

  const mutate = useCallback(
    (change: (doc: DesignDocument) => DesignDocument, coalesce: boolean, keepAutoLayout = false) =>
      dispatch({ type: "change", change, coalesce, keepAutoLayout }),
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
        // Restyling or retyping a generated block still wants restacking; dragging it does not.
        !movesLayer(patch),
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
      const heading = role === "heading";
      const fontSize = Math.round(spec.width * (heading ? NEW_HEADING_SCALE : NEW_BODY_SCALE));
      const lineHeight = heading ? HEADING_LINE_HEIGHT : BODY_LINE_HEIGHT;
      append({
        id: newLayerId(),
        type: "text",
        x: area.x,
        y: area.y + area.height / 2,
        width: area.width,
        height: Math.round(fontSize * BODY_LINE_HEIGHT * 2),
        rotation: 0,
        text: heading ? "New heading" : "New text",
        role,
        fontFamily,
        fontSize,
        fontWeight: heading ? BOLD_WEIGHT : REGULAR_WEIGHT,
        italic: false,
        underline: false,
        lineThrough: false,
        lineHeight,
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

  const pasteLayer = useCallback(
    (layer: Layer, at?: { x: number; y: number }) => {
      const pastedId = newLayerId();
      mutate((doc) => {
        const spot = at ?? freeSpot(doc.layers, layer);
        return { ...doc, layers: [...doc.layers, { ...layer, id: pastedId, ...spot }] };
      }, false);
      setSelectedId(pastedId);
    },
    [mutate],
  );

  const alignLayer = useCallback(
    (id: string, edge: AlignEdge) => {
      mutate(
        (doc) => ({
          ...doc,
          layers: doc.layers.map((layer) =>
            layer.id === id
              ? ({ ...layer, ...alignedPosition(layer, area, edge) } as Layer)
              : layer,
          ),
        }),
        false,
      );
    },
    [mutate, area],
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

  const applyReflow = useCallback(
    (next: DesignDocument) => dispatch({ type: "reflow", document: next }),
    [],
  );

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
    pasteLayer,
    alignLayer,
    duplicateLayer,
    deleteLayer,
    raiseLayer,
    lowerLayer,
    setDocument,
    applyReflow,
    undo,
    redo,
    markClean,
  };
}
