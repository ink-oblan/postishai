"use client";

import type Konva from "konva";
import { Check, Eye, ImageIcon, Loader2, Plus, Redo2, Type, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { builtinFontChoices, resolveFontFamily } from "@/components/design/font-catalogue";
import { LayerInspector } from "@/components/design/LayerInspector";
import { rasterizeStage, waitForBackground } from "@/components/design/rasterize";
import { ShortcutDialog } from "@/components/design/ShortcutDialog";
import { useDesignEditor } from "@/components/design/useDesignEditor";
import { useEditorShortcuts } from "@/components/design/useEditorShortcuts";
import { BackgroundPicker } from "@/components/posts/carousel/BackgroundPicker";
import {
  CarouselPreviewDialog,
  type PreviewSlide,
} from "@/components/posts/carousel/CarouselPreviewDialog";
import { type FilmstripSlide, SlideFilmstrip } from "@/components/posts/carousel/SlideFilmstrip";
import { BlockingOverlay } from "@/components/ui/blocking-overlay";
import { Button } from "@/components/ui/button";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { safeArea } from "@/lib/design/canvas-spec";
import { type DesignDocument, parseDesignDocument } from "@/lib/design/document";
import { ensureFontsLoaded, facesUsedBy, registerUploadedFont } from "@/lib/design/fonts";
import { textMeasurer } from "@/lib/design/measure-text";
import { reflowAutoLayout } from "@/lib/design/reflow";
import { POLLING } from "@/lib/polling-config";
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

export interface EditorSlide {
  id: string;
  order: number;
  headline: string | null;
  visualPrompt: string;
  status: string;
  hasImage: boolean;
  imageVersion: number;
  design: unknown;
}

interface SlideEditorProps {
  postId: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS";
  initialSlides: EditorSlide[];
  logoAssetId: string | null;
  uploadedFonts: { assetId: string; name: string }[];
}

const MAX_STAGE_WIDTH = 420;
const MIN_STAGE_WIDTH = 160;

export function SlideEditor({
  postId,
  platform,
  initialSlides,
  logoAssetId,
  uploadedFonts,
}: SlideEditorProps) {
  const router = useRouter();
  const spec = useMemo(() => carouselCanvas(platform), [platform]);
  const [slides, setSlides] = useState(initialSlides);
  const [selectedSlideId, setSelectedSlideId] = useState(initialSlides[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewSlides, setPreviewSlides] = useState<PreviewSlide[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [frozenSelectionId, setFrozenSelectionId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const stageAreaRef = useRef<HTMLDivElement | null>(null);
  const stageWidth = useFittedStageWidth(stageAreaRef, spec);

  const selectedSlide = slides.find((slide) => slide.id === selectedSlideId) ?? null;

  // Read once, on mount: the effect below is what swaps documents afterwards.
  const editor = useDesignEditor(documentFor(selectedSlide), spec);
  const { setDocument, select, applyReflow } = editor;

  // The restack below runs off a snapshot, so it needs the selection as of when it finishes.
  const selectedSlideIdRef = useRef(selectedSlideId);
  selectedSlideIdRef.current = selectedSlideId;

  const fonts = useMemo(
    () => [
      ...builtinFontChoices(),
      ...uploadedFonts.map((font) => ({ name: font.name, family: `brandfont-${font.assetId}` })),
    ],
    [uploadedFonts],
  );

  useEffect(() => {
    for (const font of uploadedFonts) registerUploadedFont(font.assetId);
  }, [uploadedFonts]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on slide identity, or polling would discard edits
  useEffect(() => {
    setDocument(documentFor(selectedSlide), { markClean: true });
    select(null);
  }, [selectedSlideId, setDocument, select]);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  useEffect(
    () => () => {
      for (const preview of previewSlides) URL.revokeObjectURL(preview.url);
    },
    [previewSlides],
  );

  const stepSlide = useCallback(
    (delta: number) => {
      setSelectedSlideId((current) => {
        const index = orderedSlides.findIndex((slide) => slide.id === current);
        if (index === -1) return orderedSlides[0]?.id ?? current;

        const next = wrapIndex(index + delta, orderedSlides.length);
        return orderedSlides[next]?.id ?? current;
      });
    },
    [orderedSlides],
  );

  const anyPending = slides.some(
    (slide) =>
      slide.status === CAROUSEL_SLIDE_STATUS.PENDING ||
      slide.status === CAROUSEL_SLIDE_STATUS.GENERATING,
  );

  // While backgrounds are still generating the stage has nothing to draw, so poll until they land.
  useEffect(() => {
    if (!anyPending) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/carousel/status`);
        if (!res.ok) return;
        const data = await res.json();

        setSlides((current) =>
          current.map((slide) => {
            const fresh = data.slides.find((s: { id: string }) => s.id === slide.id);
            return fresh
              ? {
                  ...slide,
                  status: fresh.status,
                  hasImage: fresh.hasImage,
                  imageVersion: fresh.imageVersion,
                }
              : slide;
          }),
        );
      } catch {
        // transient, next tick retries
      }
    }, POLLING.STATUS);

    return () => clearInterval(poll);
  }, [anyPending, postId]);

  const slideBackgroundUrl = useCallback(
    (slide: EditorSlide) =>
      slide.hasImage
        ? `/api/posts/${postId}/carousel/slides/${slide.id}/image?t=${slide.imageVersion}`
        : null,
    [postId],
  );

  const backgroundUrl = selectedSlide ? slideBackgroundUrl(selectedSlide) : null;

  const persistDesign = useCallback(
    async (slideId: string, design: DesignDocument) => {
      const res = await fetch(`/api/posts/${postId}/carousel/slides/${slideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save slide");
      }
    },
    [postId],
  );

  const saveDesign = useCallback(async () => {
    if (!selectedSlide) return false;
    setSaving(true);
    try {
      await persistDesign(selectedSlide.id, editor.document);
      setSlides((current) =>
        current.map((slide) =>
          slide.id === selectedSlide.id ? { ...slide, design: editor.document } : slide,
        ),
      );
      editor.markClean();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save slide");
      return false;
    } finally {
      setSaving(false);
    }
  }, [editor, persistDesign, selectedSlide]);

  /**
   * The generator stacks a slide's text against a guess at how the copy will wrap — it has no
   * font metrics on the server — and that guess undercounts lines for wide glyphs, which is what
   * leaves a body paragraph sitting inside the headline above it. The browser can measure the
   * real thing, so restack every generated slide here and write the corrections back: doing it
   * up front, over all slides rather than just the open one, keeps preview and publish reading
   * corrected documents instead of racing the editor for them.
   *
   * Deliberately without an abort: the ref is what keeps this to one run, and a correction that
   * lands after a remount is still worth saving. Cancelling on teardown would instead mean Strict
   * Mode's double mount aborts the only run there is.
   */
  const restacked = useRef(false);

  useEffect(() => {
    if (restacked.current) return;
    restacked.current = true;

    void (async () => {
      await Promise.all(uploadedFonts.map((font) => registerUploadedFont(font.assetId)));

      const documents = initialSlides.map((slide) => ({ slide, document: documentFor(slide) }));
      await ensureFontsLoaded(
        documents.flatMap(({ document }) => facesUsedBy(document, resolveFontFamily)),
      );

      const measure = textMeasurer(resolveFontFamily);
      const area = safeArea(spec);
      const corrected = documents.flatMap(({ slide, document }) => {
        const next = reflowAutoLayout(document, area, measure);
        return next ? [{ id: slide.id, document: next }] : [];
      });
      if (corrected.length === 0) return;

      setSlides((current) =>
        current.map((slide) => {
          const fix = corrected.find((entry) => entry.id === slide.id);
          return fix ? { ...slide, design: fix.document } : slide;
        }),
      );

      const open = corrected.find((entry) => entry.id === selectedSlideIdRef.current);
      if (open) applyReflow(open.document);

      // Best effort: a slide that fails to save is simply restacked again on the next visit.
      await Promise.all(
        corrected.map((entry) => persistDesign(entry.id, entry.document).catch(() => {})),
      );
    })();
  }, [applyReflow, initialSlides, persistDesign, spec, uploadedFonts]);

  // Every slide has to be drawn to export it, and only one stage exists — so each slide is
  // selected in turn and rasterised once the stage has actually rendered it.
  const renderSlides = useCallback(async () => {
    const rendered: { slide: EditorSlide; blob: Blob }[] = [];

    for (const [index, slide] of orderedSlides.entries()) {
      setRenderProgress({ current: index + 1, total: orderedSlides.length });
      setSelectedSlideId(slide.id);
      const document = documentFor(slide);
      setDocument(document, { markClean: true });
      await nextPaint();

      const stage = stageRef.current;
      if (!stage) throw new Error("The editor canvas is not ready");

      await waitForBackground(stage, slideBackgroundUrl(slide));
      rendered.push({
        slide,
        blob: await rasterizeStage(stage, document, spec, resolveFontFamily),
      });
    }

    return rendered;
  }, [orderedSlides, setDocument, slideBackgroundUrl, spec]);

  useEditorShortcuts(editor, {
    enabled: !publishing && !previewing && !previewOpen,
    onSave: () => {
      if (editor.dirty && !saving) void saveDesign();
    },
    onNextSlide: () => stepSlide(1),
    onPreviousSlide: () => stepSlide(-1),
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  async function handlePreview() {
    if (editor.dirty && !(await saveDesign())) return;

    const restoreTo = selectedSlideId;
    setFrozenSelectionId(restoreTo);
    setPreviewing(true);
    try {
      const rendered = await renderSlides();

      setPreviewSlides(
        rendered.map(({ slide, blob }) => ({
          id: slide.id,
          order: slide.order,
          headline: slide.headline,
          url: URL.createObjectURL(blob),
        })),
      );
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to render the preview");
    } finally {
      if (restoreTo) setSelectedSlideId(restoreTo);
      setRenderProgress(null);
      setPreviewing(false);
      setFrozenSelectionId(null);
    }
  }

  async function handlePublish() {
    if (editor.dirty && !(await saveDesign())) return;

    const restoreTo = selectedSlideId;
    setFrozenSelectionId(restoreTo);
    setPublishing(true);
    try {
      const form = new FormData();
      for (const { slide, blob } of await renderSlides()) {
        form.append("slides", blob, `${slide.order + 1}.png`);
      }
      setRenderProgress(null);

      const res = await fetch(`/api/posts/${postId}/carousel/publish`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to complete the post");
      }
      toast.success("Carousel complete — writing the caption");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete the post");
      if (restoreTo) setSelectedSlideId(restoreTo);
      setRenderProgress(null);
      setPublishing(false);
      setFrozenSelectionId(null);
    }
  }

  const filmstrip: FilmstripSlide[] = slides.map((slide) => ({
    id: slide.id,
    order: slide.order,
    headline: slide.headline,
    status: slide.status,
    hasImage: slide.hasImage,
    imageUrl: slide.hasImage
      ? `/api/posts/${postId}/carousel/slides/${slide.id}/image?t=${slide.imageVersion}`
      : null,
  }));

  const selectedLayer =
    editor.document.layers.find((layer) => layer.id === editor.selectedId) ?? null;

  const rendering = previewing || publishing;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-4">
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="text-muted-foreground text-xs underline-offset-2 hover:underline"
        >
          Press{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            Ctrl+Shift+?
          </kbd>{" "}
          for keyboard shortcuts
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {anyPending && (
            <span className="text-muted-foreground text-xs">Waiting for backgrounds…</span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={saveDesign}
            disabled={saving || !editor.dirty}
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save slide
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={previewing || publishing || anyPending || slides.length === 0}
          >
            {previewing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Rendering preview...
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={handlePublish} disabled={previewing || publishing || anyPending}>
            {publishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering slides...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete post
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/** biome-ignore lint/a11y/noStaticElementInteractions: deselect mirrors the canvas's own click-away, and Esc already does it from the keyboard */}
          <div
            ref={stageAreaRef}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) editor.select(null);
            }}
            className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
          >
            <div style={{ width: stageWidth }} data-testid="slide-stage">
              <DesignStage
                document={editor.document}
                spec={spec}
                width={stageWidth}
                backgroundUrl={backgroundUrl}
                logoUrl={
                  logoAssetId ? (assetId) => `/api/brand-profile/file?id=${assetId}` : undefined
                }
                selectedId={editor.selectedId}
                onSelect={editor.select}
                onLayerChange={editor.updateLayer}
                onLayerCommit={editor.commitLayer}
                onGestureEnd={editor.endGesture}
                resolveFontFamily={resolveFontFamily}
                stageRef={stageRef}
              />
            </div>
          </div>

          <SlideFilmstrip
            slides={filmstrip}
            selectedId={frozenSelectionId ?? selectedSlideId}
            onSelect={setSelectedSlideId}
            canvas={spec}
          />
        </div>

        <div className="min-h-0 w-full flex-1 space-y-5 overflow-y-auto lg:w-96 lg:flex-none lg:border-l lg:pl-6">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.addTextLayer("body", "Inter", "#ffffff")}
            >
              <Type className="mr-1.5 h-3.5 w-3.5" />
              Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.addShapeLayer("#000000")}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Shape
            </Button>
            {logoAssetId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => editor.addLogoLayer(logoAssetId)}
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
              disabled={!editor.canUndo}
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
              disabled={!editor.canRedo}
            >
              <Redo2 className="mr-1.5 h-3.5 w-3.5" />
              Redo
            </Button>
          </div>

          <LayerInspector
            layer={selectedLayer}
            fonts={fonts}
            onChange={(patch) => editor.selectedId && editor.updateLayer(editor.selectedId, patch)}
            onDuplicate={() => editor.selectedId && editor.duplicateLayer(editor.selectedId)}
            onDelete={() => editor.selectedId && editor.deleteLayer(editor.selectedId)}
            onRaise={() => editor.selectedId && editor.raiseLayer(editor.selectedId)}
            onLower={() => editor.selectedId && editor.lowerLayer(editor.selectedId)}
          />

          {selectedSlide && (
            <BackgroundPicker
              postId={postId}
              slideId={selectedSlide.id}
              visualPrompt={selectedSlide.visualPrompt}
              status={selectedSlide.status}
              onRegenerated={() =>
                setSlides((current) =>
                  current.map((slide) =>
                    slide.id === selectedSlide.id
                      ? { ...slide, status: CAROUSEL_SLIDE_STATUS.GENERATING }
                      : slide,
                  ),
                )
              }
            />
          )}
        </div>

        <BlockingOverlay
          active={rendering}
          title={renderProgress || !publishing ? "Rendering slides…" : "Uploading slides…"}
          description={
            renderProgress
              ? `Slide ${renderProgress.current} of ${renderProgress.total}`
              : undefined
          }
        />
      </div>

      <CarouselPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        slides={previewSlides}
        canvas={spec}
      />

      <ShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function useFittedStageWidth(
  areaRef: React.RefObject<HTMLDivElement | null>,
  spec: { width: number; height: number },
): number {
  const [width, setWidth] = useState(MAX_STAGE_WIDTH);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      const fitted = Math.min(box.width, (box.height * spec.width) / spec.height, MAX_STAGE_WIDTH);
      setWidth(Math.max(Math.floor(fitted), MIN_STAGE_WIDTH));
    });
    observer.observe(area);

    return () => observer.disconnect();
  }, [areaRef, spec.width, spec.height]);

  return width;
}

/**
 * The slide row owns its background image, so the document only carries the solid colour drawn
 * underneath it. Storing the path here too would go stale the moment it is regenerated.
 */
function documentFor(slide: EditorSlide | null): DesignDocument {
  const parsed = slide ? parseDesignDocument(slide.design) : undefined;
  return parsed?.document ?? { background: { kind: "solid", color: "#111111" }, layers: [] };
}

/** Two frames: one for React to commit the new document, one for Konva to draw it. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
