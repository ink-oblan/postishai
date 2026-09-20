"use client";

import type Konva from "konva";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Plus,
  Redo2,
  Type,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DesignEditorProps,
  DesignEditorSlotContext,
} from "@/components/design/design-editor-contract";
import { type ExportedPage, exportPages } from "@/components/design/export-pages";
import { LayerInspector } from "@/components/design/LayerInspector";
import { MobileEditorToolbar } from "@/components/design/MobileEditorToolbar";
import { MobileFontSheet } from "@/components/design/MobileFontSheet";
import { PageOptionsSheet } from "@/components/design/PageOptionsSheet";
import { ShortcutDialog } from "@/components/design/ShortcutDialog";
import { useAutosave } from "@/components/design/useAutosave";
import { useDesignEditor } from "@/components/design/useDesignEditor";
import { editorShortcutGroups, useEditorShortcuts } from "@/components/design/useEditorShortcuts";
import { usePlate } from "@/components/design/usePlate";
import { useStageViewport } from "@/components/design/useStageViewport";
import { useStartupReflow } from "@/components/design/useStartupReflow";
import { BlockingOverlay } from "@/components/ui/blocking-overlay";
import { Button } from "@/components/ui/button";
import { EMPTY_DOCUMENT } from "@/lib/design/document";
import { textMeasurer } from "@/lib/design/measure-text";
import { wrapIndex } from "@/lib/utils";

// Konva reaches for `window` at import time, so it must never enter the server graph.
const DesignStage = dynamic(
  () => import("@/components/design/DesignStage").then((m) => m.DesignStage),
  { ssr: false, loading: () => <StagePlaceholder /> },
);

function StagePlaceholder() {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const NEW_TEXT_FONT = "Inter";
const NEW_TEXT_COLOR = "#ffffff";
const NEW_SHAPE_FILL = "#000000";

export function DesignEditor({
  pages,
  initialDocuments,
  initialPageId,
  spec,
  assets,
  persistence,
  labels,
  busy: hostBusy,
  onError,
  ref,
  renderHeader,
  renderPageStrip,
  renderPageOptions,
}: DesignEditorProps) {
  const pageLabel = labels?.page ?? "page";
  const [textEditing, setTextEditing] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [fontsOpen, setFontsOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [frozenPageId, setFrozenPageId] = useState<string | null>(null);
  const operation = useRef(false);

  const stageRef = useRef<Konva.Stage | null>(null);
  const viewport = useStageViewport(spec, stageRef, textEditing);
  const { stageWidth } = viewport;

  const measure = useMemo(() => textMeasurer(assets.resolveFontFamily), [assets.resolveFontFamily]);

  const editor = useDesignEditor(
    { documents: initialDocuments, pageId: initialPageId ?? pages[0]?.id ?? null },
    spec,
    measure,
  );
  const { select, openPage, applyReflow } = editor;
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const pageIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const backgroundUrlFor = useCallback(
    (pageId: string) => pagesRef.current.find((page) => page.id === pageId)?.backgroundUrl ?? null,
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the open page, which is what drops the selection
  useEffect(() => {
    select(null);
  }, [editor.pageId, select]);

  const preparing = useStartupReflow({
    initialDocuments,
    spec,
    resolveFontFamily: assets.resolveFontFamily,
    loadFonts: assets.loadFonts,
    applyReflow,
    savePage: persistence.savePage,
    onError: (err) => onError(err, "prepare"),
  });

  const {
    saving,
    failed: saveFailed,
    flush,
    saveDirty,
  } = useAutosave(editor, {
    savePage: persistence.savePage,
    enabled: !preparing,
    autosaveDelayMs: persistence.autosaveDelayMs,
    onError: (err) => onError(err, "save"),
  });

  const plate = usePlate(editor, {
    pageIds,
    backgroundUrl: backgroundUrlFor,
    spec,
    enabled: !preparing,
    operation,
    onError: (err) => onError(err, "restyle"),
  });

  const busy = preparing || saving || exporting || plate.pending || Boolean(hostBusy?.active);

  const selectPage = useCallback(
    (id: string) => {
      if (preparing || operation.current) return;
      openPage(id);
    },
    [preparing, openPage],
  );

  const stepPage = useCallback(
    (delta: number) => {
      if (pageIds.length < 2) return;
      const index = pageIds.indexOf(editorRef.current.pageId ?? "");
      const next = pageIds[wrapIndex(index + delta, pageIds.length)];
      if (next) selectPage(next);
    },
    [pageIds, selectPage],
  );

  const runExport = useCallback(async (): Promise<ExportedPage[] | null> => {
    if (preparing || operation.current) return null;
    operation.current = true;

    const restoreTo = editorRef.current.pageId;
    setFrozenPageId(restoreTo);
    setExporting(true);
    try {
      if (!(await saveDirty())) return null;

      return await exportPages({
        pageIds,
        stage: () => stageRef.current,
        spec,
        documents: () => editorRef.current.documents,
        backgroundUrl: backgroundUrlFor,
        openPage,
        assets: { resolveFontFamily: assets.resolveFontFamily, assetUrl: assets.assetUrl },
        onProgress: (current, total) => setProgress({ current, total }),
      });
    } finally {
      if (restoreTo) openPage(restoreTo);
      setProgress(null);
      setExporting(false);
      setFrozenPageId(null);
      operation.current = false;
    }
  }, [
    assets.assetUrl,
    assets.resolveFontFamily,
    backgroundUrlFor,
    openPage,
    pageIds,
    preparing,
    saveDirty,
    spec,
  ]);

  useEffect(() => {
    if (!ref) return;
    ref.current = {
      flush: () => flush(),
      exportPages: runExport,
      getDocuments: () => editorRef.current.documents,
      openPage: selectPage,
      isDirty: () => editorRef.current.dirty,
    };
    return () => {
      ref.current = null;
    };
  }, [ref, flush, runExport, selectPage]);

  useEditorShortcuts(editor, {
    enabled: !busy,
    onSave: () => void flush(),
    onNextPage: pageIds.length > 1 ? () => stepPage(1) : undefined,
    onPreviousPage: pageIds.length > 1 ? () => stepPage(-1) : undefined,
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  const highlighting = useMemo(() => {
    let highlighted = 0;
    let total = 0;

    for (const pageId of pageIds) {
      const document = editor.documents[pageId] ?? EMPTY_DOCUMENT;
      for (const layer of document.layers) {
        if (layer.type !== "text") continue;
        total += 1;
        if (layer.background) highlighted += 1;
      }
    }

    return {
      all: total > 0 && highlighted === total,
      some: highlighted > 0 && highlighted < total,
    };
  }, [editor.documents, pageIds]);

  const selectedLayer =
    editor.document.layers.find((layer) => layer.id === editor.selectedId) ?? null;

  const patchSelected = useCallback(
    (patch: Parameters<typeof editor.updateLayer>[1]) => {
      if (editor.selectedId) editor.updateLayer(editor.selectedId, patch);
    },
    [editor],
  );

  const ctx: DesignEditorSlotContext = {
    pageId: editor.pageId,
    displayPageId: frozenPageId ?? editor.pageId,
    pageIds,
    documents: editor.documents,
    document: editor.document,
    selectedLayer,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    busy,
    save: {
      state: saveFailed ? "failed" : editor.dirty ? "saving" : "saved",
      retry: () => void flush(),
    },
    openPage: selectPage,
    stepPage,
    showShortcuts: () => setShortcutsOpen(true),
    highlightAll: {
      ...highlighting,
      pending: plate.pending,
      apply: (on) => void plate.applyToAll(on),
    },
  };

  const pageStrip = renderPageStrip?.(ctx);

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-1 flex-col overflow-hidden bg-black lg:relative lg:inset-auto lg:z-auto lg:gap-4 lg:overflow-visible lg:bg-transparent">
      {renderHeader && (
        <div
          inert={busy}
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 text-white lg:hidden"
        >
          {renderHeader({ ...ctx, layout: "mobile" })}
        </div>
      )}

      {renderHeader && (
        <div
          inert={busy}
          className="hidden shrink-0 flex-wrap items-start justify-between gap-2 border-b pb-4 lg:flex"
        >
          {renderHeader({ ...ctx, layout: "desktop" })}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6">
        <div
          inert={busy || optionsOpen || fontsOpen}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:gap-3"
        >
          {/** biome-ignore lint/a11y/noStaticElementInteractions: deselect mirrors the canvas's own click-away, and Esc already does it from the keyboard */}
          <div
            ref={viewport.areaRef}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) editor.select(null);
            }}
            {...viewport.handlers}
            className="absolute inset-0 flex min-h-0 min-w-0 flex-1 touch-none items-center justify-center overflow-hidden lg:relative lg:touch-auto"
          >
            <div
              className={`lg:!transform-none shrink-0 origin-center overflow-hidden lg:rounded-lg ${
                viewport.pinching ? "" : "transition-transform duration-150 ease-out"
              }`}
              style={{
                width: stageWidth,
                transform: `translate3d(${viewport.pan.x}px, ${viewport.pan.y}px, 0) scale(${viewport.zoom})`,
              }}
              data-testid="design-stage"
            >
              <DesignStage
                document={editor.document}
                spec={spec}
                width={stageWidth}
                backgroundUrl={backgroundUrlFor(editor.pageId ?? "")}
                logoUrl={assets.assetUrl}
                selectedId={editor.selectedId}
                onSelect={editor.select}
                onLayerChange={editor.updateLayer}
                onLayerCommit={editor.commitLayer}
                onGestureEnd={editor.endGesture}
                onTextEditingChange={setTextEditing}
                resolveFontFamily={assets.resolveFontFamily}
                stageRef={stageRef}
              />
            </div>
          </div>

          {pageStrip && (
            <>
              {stripOpen && (
                <button
                  type="button"
                  aria-label={`Close ${pageLabel} previews`}
                  onClick={() => setStripOpen(false)}
                  className="fixed inset-0 z-30 cursor-default lg:hidden"
                />
              )}

              <div
                className={`pointer-events-none absolute inset-x-0 z-40 flex items-center justify-start overflow-visible px-2 transition-[height,bottom] duration-300 ease-out lg:pointer-events-auto lg:static lg:z-auto lg:block lg:h-auto lg:p-0 ${
                  stripOpen
                    ? "bottom-[max(0.5rem,env(safe-area-inset-bottom))] h-[7.125rem]"
                    : "bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.125rem)] h-12"
                }`}
              >
                <div
                  className={`pointer-events-auto relative flex min-h-12 max-w-full items-center overflow-hidden rounded-2xl bg-primary/95 text-primary-foreground shadow-xl backdrop-blur-xl transition-[width,height] duration-300 ease-out lg:h-auto lg:min-h-0 lg:w-full lg:overflow-visible lg:rounded-none lg:bg-transparent lg:text-foreground lg:shadow-none lg:backdrop-blur-none ${
                    stripOpen ? "h-full w-full" : "h-12 w-12"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={
                      stripOpen ? `Hide ${pageLabel} previews` : `Show ${pageLabel} previews`
                    }
                    aria-expanded={stripOpen}
                    onClick={() => setStripOpen((open) => !open)}
                    className="absolute top-1 left-1 z-10 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-colors lg:hidden"
                  >
                    {stripOpen ? (
                      <ChevronLeft className="size-5" />
                    ) : (
                      <ChevronRight className="size-5" />
                    )}
                  </button>
                  <div
                    className={`min-w-0 flex-1 px-12 transition-opacity duration-200 lg:pointer-events-auto lg:px-0 lg:opacity-100 ${
                      stripOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    data-strip-open={stripOpen}
                  >
                    {pageStrip}
                  </div>
                </div>
              </div>
            </>
          )}

          <MobileEditorToolbar
            layer={selectedLayer}
            busy={busy}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            visible={!stripOpen}
            zoom={viewport.zoom}
            canAddLogo={Boolean(assets.logoAssetId)}
            pageLabel={pageLabel}
            onAddText={() => editor.addTextLayer("body", NEW_TEXT_FONT, NEW_TEXT_COLOR)}
            onAddShape={() => editor.addShapeLayer(NEW_SHAPE_FILL)}
            onAddLogo={() => assets.logoAssetId && editor.addLogoLayer(assets.logoAssetId)}
            onUndo={editor.undo}
            onRedo={editor.redo}
            onResetZoom={viewport.reset}
            onChange={patchSelected}
            onToggleHighlight={(on) => void plate.toggle(on)}
            onDuplicate={() => editor.selectedId && editor.duplicateLayer(editor.selectedId)}
            onDelete={() => editor.selectedId && editor.deleteLayer(editor.selectedId)}
            onRaise={() => editor.selectedId && editor.raiseLayer(editor.selectedId)}
            onLower={() => editor.selectedId && editor.lowerLayer(editor.selectedId)}
            onOpenDetails={() => setOptionsOpen(true)}
            onOpenFonts={() => setFontsOpen(true)}
          />
        </div>

        <div
          inert={busy}
          className="hidden min-h-0 w-96 flex-none space-y-5 overflow-y-auto border-l pr-3 pl-6 lg:block"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.addTextLayer("body", NEW_TEXT_FONT, NEW_TEXT_COLOR)}
            >
              <Type className="mr-1.5 h-3.5 w-3.5" />
              Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.addShapeLayer(NEW_SHAPE_FILL)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Shape
            </Button>
            {assets.logoAssetId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => assets.logoAssetId && editor.addLogoLayer(assets.logoAssetId)}
              >
                <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                Logo
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Undo (Ctrl+Z)"
              onClick={editor.undo}
              disabled={!editor.canUndo || plate.pending}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Redo (Ctrl+Shift+Z)"
              onClick={editor.redo}
              disabled={!editor.canRedo || plate.pending}
            >
              <Redo2 className="mr-1.5 h-3.5 w-3.5" />
              Redo
            </Button>
          </div>

          <LayerInspector
            layer={selectedLayer}
            fonts={assets.fonts}
            resolveFontFamily={assets.resolveFontFamily}
            onChange={patchSelected}
            onDuplicate={() => editor.selectedId && editor.duplicateLayer(editor.selectedId)}
            onDelete={() => editor.selectedId && editor.deleteLayer(editor.selectedId)}
            onRaise={() => editor.selectedId && editor.raiseLayer(editor.selectedId)}
            onLower={() => editor.selectedId && editor.lowerLayer(editor.selectedId)}
            onTogglePlate={(on) => void plate.toggle(on)}
          />

          {renderPageOptions?.({ ...ctx, surface: "panel" })}
        </div>

        <PageOptionsSheet
          open={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          layer={selectedLayer}
          pageLabel={pageLabel}
          onChange={patchSelected}
        >
          {renderPageOptions?.({ ...ctx, surface: "sheet" })}
        </PageOptionsSheet>
        <MobileFontSheet
          open={fontsOpen && selectedLayer?.type === "text"}
          onClose={() => setFontsOpen(false)}
          value={selectedLayer?.type === "text" ? selectedLayer.fontFamily : ""}
          fonts={assets.fonts}
          resolveFontFamily={assets.resolveFontFamily}
          onSelect={(fontFamily) => patchSelected({ fontFamily })}
        />
      </div>

      <BlockingOverlay
        active={busy}
        className="z-50"
        title={
          hostBusy?.active
            ? hostBusy.title
            : preparing
              ? `Preparing ${pageLabel} layouts…`
              : saving
                ? `Saving ${pageLabel}…`
                : `Rendering ${labels?.pages?.toLowerCase() ?? "pages"}…`
        }
        description={
          progress
            ? `${pageLabel.charAt(0).toUpperCase()}${pageLabel.slice(1)} ${progress.current} of ${progress.total}`
            : hostBusy?.description
        }
      />

      <ShortcutDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        groups={editorShortcutGroups(labels)}
      />
    </div>
  );
}
