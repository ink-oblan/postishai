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

export const EMPTY_DOCUMENT: DesignDocument = {
  background: { kind: "solid", color: "#111111" },
  layers: [],
};

export type SlideDocuments = Record<string, DesignDocument>;

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

interface HistoryEntry {
  slideId: string;
  before: SlideDocuments;
  after: SlideDocuments;
}

interface EditorState {
  documents: SlideDocuments;
  slideId: string | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  dirty: string[];
  /** True while a drag, transform or nudge run is streaming, so the gesture is one undo step. */
  coalescing: boolean;
}

export interface DesignEditorInit {
  documents: SlideDocuments;
  slideId: string | null;
}

type EditorAction =
  | {
      type: "change";
      change: (doc: DesignDocument) => DesignDocument;
      coalesce: boolean;
      /** Set by edits that leave the generated stack's shape alone, such as recolouring. */
      keepAutoLayout?: boolean;
    }
  | { type: "changeSlides"; documents: SlideDocuments }
  | { type: "open"; slideId: string }
  | { type: "reflow"; documents: SlideDocuments }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "endGesture" }
  | { type: "saved"; documents: SlideDocuments };

function initialState(init: DesignEditorInit): EditorState {
  return {
    documents: init.documents,
    slideId: init.slideId,
    past: [],
    future: [],
    dirty: [],
    coalescing: false,
  };
}

function markDirty(dirty: string[], ids: string[]): string[] {
  const added = ids.filter((id) => !dirty.includes(id));
  return added.length === 0 ? dirty : [...dirty, ...added];
}

function push(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...entries, entry].slice(-MAX_HISTORY);
}

function touched(documents: SlideDocuments, next: SlideDocuments) {
  const before: SlideDocuments = {};
  const after: SlideDocuments = {};

  for (const [id, document] of Object.entries(next)) {
    const current = documents[id];
    if (!current || current === document) continue;
    before[id] = current;
    after[id] = document;
  }

  return { before, after, ids: Object.keys(after) };
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

function reduce(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "change": {
      const slideId = state.slideId;
      if (!slideId) return state;

      const current = state.documents[slideId] ?? EMPTY_DOCUMENT;
      const changed = action.change(current);
      const next = action.keepAutoLayout ? changed : withoutAutoLayout(changed);
      if (next === current) return state;

      const previous = state.past.at(-1);
      const fold =
        action.coalesce &&
        state.coalescing &&
        previous?.slideId === slideId &&
        Object.keys(previous.after).length === 1;
      const entry: HistoryEntry =
        fold && previous
          ? { ...previous, after: { [slideId]: next } }
          : { slideId, before: { [slideId]: current }, after: { [slideId]: next } };

      return {
        ...state,
        documents: { ...state.documents, [slideId]: next },
        past: fold ? [...state.past.slice(0, -1), entry] : push(state.past, entry),
        future: [],
        dirty: markDirty(state.dirty, [slideId]),
        coalescing: action.coalesce,
      };
    }
    case "changeSlides": {
      const { before, after, ids } = touched(state.documents, action.documents);
      if (ids.length === 0) return state;

      return {
        ...state,
        documents: { ...state.documents, ...after },
        past: push(state.past, { slideId: state.slideId ?? ids[0], before, after }),
        future: [],
        dirty: markDirty(state.dirty, ids),
        coalescing: false,
      };
    }
    case "open":
      return action.slideId === state.slideId
        ? state
        : { ...state, slideId: action.slideId, coalescing: false };
    /**
     * A correction to a generated layout rather than an edit of the user's: it stays out of the
     * history, because undoing back into overlapping text is not something anyone asks for.
     */
    case "reflow":
      return { ...state, documents: { ...state.documents, ...action.documents } };
    case "undo": {
      const entry = state.past.at(-1);
      if (!entry) return state;

      return {
        ...state,
        documents: { ...state.documents, ...entry.before },
        slideId: entry.slideId,
        past: state.past.slice(0, -1),
        future: push(state.future, entry),
        dirty: markDirty(state.dirty, Object.keys(entry.before)),
        coalescing: false,
      };
    }
    case "redo": {
      const entry = state.future.at(-1);
      if (!entry) return state;

      return {
        ...state,
        documents: { ...state.documents, ...entry.after },
        slideId: entry.slideId,
        past: push(state.past, entry),
        future: state.future.slice(0, -1),
        dirty: markDirty(state.dirty, Object.keys(entry.after)),
        coalescing: false,
      };
    }
    case "endGesture":
      return state.coalescing ? { ...state, coalescing: false } : state;
    case "saved": {
      const dirty = state.dirty.filter((id) => state.documents[id] !== action.documents[id]);
      return dirty.length === state.dirty.length ? state : { ...state, dirty };
    }
  }
}

export interface DesignEditorState {
  slideId: string | null;
  document: DesignDocument;
  documents: SlideDocuments;
  selectedId: string | null;
  dirty: boolean;
  dirtySlideIds: string[];
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
  /**
   * A restyle that spans whole slides, landing as one undo step across all of them. Generated
   * stacking survives it, since changing how a block looks — unlike moving one — is still the
   * generator's layout.
   */
  restyleSlides: (documents: SlideDocuments) => void;
  openSlide: (id: string) => void;
  /** Swaps in restacked generated layouts without touching history or the dirty set. */
  applyReflow: (documents: SlideDocuments) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (documents: SlideDocuments) => void;
}

export function useDesignEditor(init: DesignEditorInit, spec: CanvasSpec): DesignEditorState {
  const [state, dispatch] = useReducer(reduce, init, initialState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const area = useMemo(() => safeArea(spec), [spec]);
  const document = (state.slideId ? state.documents[state.slideId] : null) ?? EMPTY_DOCUMENT;

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

  const restyleSlides = useCallback(
    (documents: SlideDocuments) => dispatch({ type: "changeSlides", documents }),
    [],
  );

  const openSlide = useCallback((id: string) => dispatch({ type: "open", slideId: id }), []);

  const applyReflow = useCallback(
    (documents: SlideDocuments) => dispatch({ type: "reflow", documents }),
    [],
  );

  const markSaved = useCallback(
    (documents: SlideDocuments) => dispatch({ type: "saved", documents }),
    [],
  );

  const raiseLayer = useCallback((id: string) => reorder(id, 1), [reorder]);
  const lowerLayer = useCallback((id: string) => reorder(id, -1), [reorder]);

  return {
    slideId: state.slideId,
    document,
    documents: state.documents,
    selectedId,
    dirty: state.dirty.length > 0,
    dirtySlideIds: state.dirty,
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
    restyleSlides,
    openSlide,
    applyReflow,
    undo,
    redo,
    markSaved,
  };
}
