import type { ReactNode, RefObject } from "react";
import type { ExportedPage } from "@/components/design/export-pages";
import type { PageDocuments } from "@/components/design/useDesignEditor";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer } from "@/lib/design/document";
import type { FontChoice } from "@/lib/design/fonts";

/**
 * A document the editor can open, plus the photograph drawn under it. The URL lives here and
 * not in the document on purpose: it belongs to the host, it changes when a background is
 * regenerated, and swapping it must never dirty the design.
 */
export interface EditorPage {
  id: string;
  backgroundUrl: string | null;
}

export interface DesignEditorAssets {
  fonts: FontChoice[];
  /** Stored font name to CSS family. Documents store names, never families. */
  resolveFontFamily: (name: string) => string;
  /** A logo layer's opaque assetId to a URL the stage and the rasteriser can load. */
  assetUrl: (assetId: string) => string;
  /** Registers @font-face for host-uploaded fonts, before the first measure or reflow. */
  loadFonts?: () => Promise<void>;
  /** Given, the editor offers its "Add logo" command. */
  logoAssetId?: string | null;
}

export interface DesignEditorPersistence {
  savePage: (pageId: string, document: DesignDocument) => Promise<void>;
  autosaveDelayMs?: number;
}

/** "save" — a write failed. "prepare" — startup reflow failed. "restyle" — highlight-all failed. */
export type DesignEditorErrorKind = "save" | "prepare" | "restyle";

/** The nouns the editor puts on screen. A carousel passes slide/slides. */
export interface DesignEditorLabels {
  page?: string;
  pages?: string;
}

export interface HighlightAllState {
  all: boolean;
  some: boolean;
  pending: boolean;
  apply: (on: boolean) => void;
}

export interface DesignEditorSlotContext {
  /** The page the store has open. Moves under the export loop's feet. */
  pageId: string | null;
  /** The page the user is on, held still while an export cycles every page. */
  displayPageId: string | null;
  pageIds: string[];
  documents: PageDocuments;
  document: DesignDocument;
  selectedLayer: Layer | null;
  canUndo: boolean;
  canRedo: boolean;
  /** True while the editor blocks input: preparing, saving, replating, or the host is busy. */
  busy: boolean;
  save: { state: "saved" | "saving" | "failed"; retry: () => void };
  openPage: (id: string) => void;
  stepPage: (delta: number) => void;
  showShortcuts: () => void;
  highlightAll: HighlightAllState;
}

export interface DesignEditorHandle {
  /** Writes every dirty page. False if any write failed — the host stops there. */
  flush: () => Promise<boolean>;
  /**
   * Saves, then draws every page through the single stage in `pages` order, restoring the page
   * the user was on. Null when it could not run: already busy, or a write failed — in both
   * cases the editor has already reported, so the host stays quiet.
   */
  exportPages: () => Promise<ExportedPage[] | null>;
  getDocuments: () => PageDocuments;
  openPage: (id: string) => void;
  isDirty: () => boolean;
}

export interface DesignEditorProps {
  /** Live: re-render with a new backgroundUrl and the stage swaps it, dirtying nothing. */
  pages: EditorPage[];
  /**
   * Read once, at mount — this is the store's initial state, and later identities are ignored.
   * The photo is the host's and stays live; the design belongs to the editor from here on.
   */
  initialDocuments: PageDocuments;
  initialPageId?: string;
  spec: CanvasSpec;
  assets: DesignEditorAssets;
  persistence: DesignEditorPersistence;
  labels?: DesignEditorLabels;
  /** Host-owned work such as publishing. Blocks the editor and drives its overlay. */
  busy?: { active: boolean; title: string; description?: string };
  /** The editor never reaches for a toast; the host decides how to report. */
  onError: (error: unknown, kind: DesignEditorErrorKind) => void;
  ref?: RefObject<DesignEditorHandle | null>;

  renderHeader?: (ctx: DesignEditorSlotContext & { layout: "mobile" | "desktop" }) => ReactNode;
  /** Omitting this drops the page strip and its drawer entirely — the single-page case. */
  renderPageStrip?: (ctx: DesignEditorSlotContext) => ReactNode;
  renderPageOptions?: (ctx: DesignEditorSlotContext & { surface: "panel" | "sheet" }) => ReactNode;
}
