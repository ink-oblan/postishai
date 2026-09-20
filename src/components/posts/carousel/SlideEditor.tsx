"use client";

import type { Platform } from "@prisma/client";
import type Konva from "konva";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  Loader2,
  Plus,
  Redo2,
  SlidersHorizontal,
  Type,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { builtinFontChoices, resolveFontFamily } from "@/components/design/font-catalogue";
import { LayerInspector } from "@/components/design/LayerInspector";
import { rasterizeStage, waitForBackground } from "@/components/design/rasterize";
import { ShortcutDialog } from "@/components/design/ShortcutDialog";
import { sampleBackgroundRegion } from "@/components/design/sample-background";
import {
  EMPTY_DOCUMENT,
  type SlideDocuments,
  useDesignEditor,
} from "@/components/design/useDesignEditor";
import { useEditorShortcuts } from "@/components/design/useEditorShortcuts";
import { BackgroundPicker } from "@/components/posts/carousel/BackgroundPicker";
import {
  CarouselPreviewDialog,
  type PreviewSlide,
} from "@/components/posts/carousel/CarouselPreviewDialog";
import { MobileEditorToolbar } from "@/components/posts/carousel/MobileEditorToolbar";
import {
  MobileFontSheet,
  MobileOptionsSheet,
} from "@/components/posts/carousel/MobileOptionsSheet";
import { type FilmstripSlide, SlideFilmstrip } from "@/components/posts/carousel/SlideFilmstrip";
import { BlockingOverlay } from "@/components/ui/blocking-overlay";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { safeArea } from "@/lib/design/canvas-spec";
import {
  type DesignDocument,
  parseDesignDocument,
  type TextBackground,
} from "@/lib/design/document";
import {
  brandAssetUrl,
  ensureFontsLoaded,
  facesUsedBy,
  registerUploadedFont,
  uploadedFontFamily,
} from "@/lib/design/fonts";
import { textMeasurer } from "@/lib/design/measure-text";
import {
  defaultTextPlate,
  inferPlateColor,
  platedRegion,
  platePaddingForGap,
  textColorsOf,
  withTextPlates,
} from "@/lib/design/plate";
import { reflowAutoLayout } from "@/lib/design/reflow";
import { POLLING } from "@/lib/polling-config";
import { responseError, wrapIndex } from "@/lib/utils";

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
  platform: Platform;
  initialSlides: EditorSlide[];
  logoAssetId: string | null;
  uploadedFonts: { assetId: string; name: string }[];
}

const INITIAL_STAGE_WIDTH = 420;
const AUTOSAVE_DELAY_MS = 1000;
const SAVE_TOAST_ID = "slide-save";
const MIN_MOBILE_ZOOM = 0.75;
const MAX_MOBILE_ZOOM = 2.5;

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
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const operation = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewSlides, setPreviewSlides] = useState<PreviewSlide[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [frozenSelectionId, setFrozenSelectionId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [mobileFontsOpen, setMobileFontsOpen] = useState(false);
  const [mobileFilmstripOpen, setMobileFilmstripOpen] = useState(false);
  const [mobileZoom, setMobileZoom] = useState(1);
  const [mobilePan, setMobilePan] = useState({ x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const [textEditing, setTextEditing] = useState(false);
  const [platingAll, setPlatingAll] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const stageAreaRef = useRef<HTMLDivElement | null>(null);
  const zoomGestureRef = useRef({
    points: new Map<number, { x: number; y: number }>(),
    distance: 0,
    zoom: 1,
  });
  const panGestureRef = useRef<{
    pointerId: number;
    start: { x: number; y: number };
    origin: { x: number; y: number };
  } | null>(null);
  const stageWidth = useFittedStageWidth(stageAreaRef, spec);

  const initialDocuments = useMemo(
    () =>
      Object.fromEntries(
        initialSlides.map((slide) => [slide.id, documentFor(slide)]),
      ) as SlideDocuments,
    [initialSlides],
  );
  const editor = useDesignEditor(
    { documents: initialDocuments, slideId: initialSlides[0]?.id ?? null },
    spec,
  );
  const { select, openSlide, applyReflow } = editor;

  const selectedSlideId = editor.slideId;
  const selectedSlide = slides.find((slide) => slide.id === selectedSlideId) ?? null;

  const editorRef = useRef(editor);
  editorRef.current = editor;

  const fonts = useMemo(
    () => [
      ...builtinFontChoices(),
      ...uploadedFonts.map((font) => ({
        name: font.name,
        family: uploadedFontFamily(font.assetId),
      })),
    ],
    [uploadedFonts],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the open slide, which is what drops the selection
  useEffect(() => {
    select(null);
  }, [selectedSlideId, select]);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const highlighting = useMemo(() => {
    let highlighted = 0;
    let total = 0;

    for (const slide of orderedSlides) {
      const document = editor.documents[slide.id] ?? EMPTY_DOCUMENT;
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
  }, [editor.documents, orderedSlides]);

  useEffect(
    () => () => {
      for (const preview of previewSlides) URL.revokeObjectURL(preview.url);
    },
    [previewSlides],
  );

  const anyPending = slides.some(
    (slide) =>
      slide.status === CAROUSEL_SLIDE_STATUS.PENDING ||
      slide.status === CAROUSEL_SLIDE_STATUS.GENERATING,
  );

  const anyFailed = slides.some((slide) => slide.status === CAROUSEL_SLIDE_STATUS.FAILED);

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
      if (!res.ok) throw await responseError(res, "Failed to save slide");
    },
    [postId],
  );

  const writeSlides = useCallback(
    async (ids: string[]) => {
      const saved: SlideDocuments = {};
      try {
        for (const id of ids) {
          const document = editorRef.current.documents[id];
          if (!document) continue;
          await persistDesign(id, document);
          saved[id] = document;
        }
        setSaveFailed(false);
        return true;
      } catch (err) {
        setSaveFailed(true);
        toast.error(err instanceof Error ? err.message : "Failed to save slide", {
          id: SAVE_TOAST_ID,
        });
        return false;
      } finally {
        if (Object.keys(saved).length > 0) editorRef.current.markSaved(saved);
      }
    },
    [persistDesign],
  );

  const writes = useRef<Promise<boolean>>(Promise.resolve(true));

  const flush = useCallback(
    (ids?: string[]) => {
      const run = writes.current.then(() => writeSlides(ids ?? editorRef.current.dirtySlideIds));
      writes.current = run.catch(() => false);
      return run;
    },
    [writeSlides],
  );

  const saveDirty = useCallback(async () => {
    if (editorRef.current.dirtySlideIds.length === 0) return true;
    setSaving(true);
    try {
      return await flush();
    } finally {
      setSaving(false);
    }
  }, [flush]);

  useEffect(() => {
    if (initializing) return;

    const pending = editor.dirtySlideIds.filter((id) => id !== editor.slideId);
    if (pending.length > 0) void flush(pending);
  }, [editor.dirtySlideIds, editor.slideId, flush, initializing]);

  const openSlideDirty = editor.slideId !== null && editor.dirtySlideIds.includes(editor.slideId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the document so every edit pushes the save back
  useEffect(() => {
    if (initializing || !openSlideDirty) return;

    const timer = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [editor.document, flush, initializing, openSlideDirty]);

  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    if (!editor.dirty) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editor.dirty]);

  const selectSlide = useCallback(
    (id: string) => {
      if (initializing || operation.current) return;
      openSlide(id);
    },
    [initializing, openSlide],
  );

  const stepSlide = useCallback(
    (delta: number) => {
      const index = orderedSlides.findIndex((slide) => slide.id === selectedSlideId);
      const next = orderedSlides[wrapIndex(index + delta, orderedSlides.length)];
      if (next) selectSlide(next.id);
    },
    [orderedSlides, selectSlide, selectedSlideId],
  );

  /**
   * A plate colour is per slide, not per carousel: it is read off the photograph behind that
   * slide's own copy, so each one gets a band that belongs to its picture. A slide still waiting
   * on its background has nothing to read, and falls back to the neutral plate.
   */
  const inferPlateFor = useCallback(
    async (slide: EditorSlide, document: DesignDocument): Promise<TextBackground> => {
      const url = slideBackgroundUrl(slide);
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
    [slideBackgroundUrl, spec],
  );

  const togglePlate = useCallback(
    async (on: boolean) => {
      const id = editor.selectedId;
      if (!id) return;
      if (!on) {
        editor.updateLayer(id, { background: undefined });
        return;
      }

      const plate = selectedSlide
        ? await inferPlateFor(selectedSlide, editor.document)
        : defaultTextPlate();
      const padding = editor.document.autoLayout
        ? platePaddingForGap(editor.document.autoLayout.gap)
        : plate.padding;

      editor.updateLayer(id, { background: { ...plate, padding } });
    },
    [editor, inferPlateFor, selectedSlide],
  );

  const applyHighlightToAll = useCallback(
    async (adding: boolean) => {
      if (initializing || operation.current) return;
      operation.current = true;
      setPlatingAll(true);
      try {
        const documents = Object.fromEntries(
          await Promise.all(
            orderedSlides.map(async (slide): Promise<[string, DesignDocument]> => {
              const document = editorRef.current.documents[slide.id] ?? EMPTY_DOCUMENT;
              const plate = adding ? await inferPlateFor(slide, document) : null;
              return [slide.id, withTextPlates(document, plate)];
            }),
          ),
        );

        editorRef.current.restyleSlides(documents);
        toast.success(
          adding ? "Highlighted every text block to match its photo" : "Removed every highlight",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update every slide");
      } finally {
        setPlatingAll(false);
        operation.current = false;
      }
    },
    [inferPlateFor, initializing, orderedSlides],
  );

  /**
   * The generator stacks a slide's text against a guess at how the copy will wrap — it has no
   * font metrics on the server — and that guess undercounts lines for wide glyphs, which is what
   * leaves a body paragraph sitting inside the headline above it. The browser can measure the
   * real thing, so restack every generated slide here and write the corrections back: doing it
   * up front, over all slides rather than just the open one, keeps preview and publish reading
   * corrected documents instead of racing the editor for them.
   *
   * Editing and export stay blocked until these corrections have been saved.
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

      const documents = Object.entries(initialDocuments);
      await ensureFontsLoaded(
        documents.flatMap(([, document]) => facesUsedBy(document, resolveFontFamily)),
      );

      const measure = textMeasurer(resolveFontFamily);
      const area = safeArea(spec);
      const corrected: SlideDocuments = {};
      for (const [id, document] of documents) {
        const next = reflowAutoLayout(document, area, measure);
        if (next) corrected[id] = next;
      }
      if (Object.keys(corrected).length === 0) return;

      applyReflow(corrected);

      // Best effort: a slide that fails to save is simply restacked again on the next visit.
      await Promise.all(
        Object.entries(corrected).map(([id, document]) =>
          persistDesign(id, document).catch(() => {}),
        ),
      );
    })()
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to prepare slide layouts");
      })
      .finally(() => setInitializing(false));
  }, [applyReflow, initialDocuments, persistDesign, spec, uploadedFonts]);

  // Every slide has to be drawn to export it, and only one stage exists — so each slide is
  // selected in turn and rasterised once the stage has actually rendered it.
  const renderSlides = useCallback(async () => {
    const rendered: { slide: EditorSlide; blob: Blob }[] = [];

    for (const [index, slide] of orderedSlides.entries()) {
      setRenderProgress({ current: index + 1, total: orderedSlides.length });
      openSlide(slide.id);
      const document = editorRef.current.documents[slide.id] ?? EMPTY_DOCUMENT;
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
  }, [openSlide, orderedSlides, slideBackgroundUrl, spec]);

  useEditorShortcuts(editor, {
    enabled: !initializing && !saving && !publishing && !previewing && !previewOpen && !platingAll,
    onSave: () => void flush(),
    onNextSlide: () => stepSlide(1),
    onPreviousSlide: () => stepSlide(-1),
    onShowShortcuts: () => setShortcutsOpen(true),
  });

  /** Winds the render-run state back down: the slide the user was on, and every busy flag. */
  function endRenderRun(restoreTo: string | null, setBusy: (busy: boolean) => void) {
    if (restoreTo) openSlide(restoreTo);
    setRenderProgress(null);
    setBusy(false);
    setFrozenSelectionId(null);
    operation.current = false;
  }

  async function handlePreview() {
    if (initializing || operation.current) return;
    operation.current = true;

    const restoreTo = selectedSlideId;
    setFrozenSelectionId(restoreTo);
    setPreviewing(true);
    try {
      if (!(await saveDirty())) return;
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
      endRenderRun(restoreTo, setPreviewing);
    }
  }

  async function handlePublish() {
    if (initializing || operation.current) return;
    operation.current = true;

    const restoreTo = selectedSlideId;
    setFrozenSelectionId(restoreTo);
    setPublishing(true);
    try {
      if (!(await saveDirty())) {
        endRenderRun(restoreTo, setPublishing);
        return;
      }
      const form = new FormData();
      for (const { slide, blob } of await renderSlides()) {
        form.append("slides", blob, `${slide.order + 1}.png`);
      }
      setRenderProgress(null);

      const res = await fetch(`/api/posts/${postId}/carousel/publish`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw await responseError(res, "Failed to complete the post");

      toast.success("Carousel complete — writing the caption");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete the post");
      // Only on failure: a successful publish holds the overlay up through the refresh.
      endRenderRun(restoreTo, setPublishing);
    }
  }

  const filmstrip: FilmstripSlide[] = slides.map((slide) => ({
    id: slide.id,
    order: slide.order,
    headline: slide.headline,
    status: slide.status,
    hasImage: slide.hasImage,
    imageUrl: slideBackgroundUrl(slide),
    document: editor.documents[slide.id] ?? EMPTY_DOCUMENT,
  }));

  const selectedLayer =
    editor.document.layers.find((layer) => layer.id === editor.selectedId) ?? null;

  const rendering = previewing || publishing;
  const busy = initializing || saving || rendering;

  useEffect(() => {
    setMobilePan((current) =>
      clampViewportPan(current, mobileZoom, stageAreaRef.current, stageWidth, spec),
    );
  }, [mobileZoom, spec, stageWidth]);

  const resetMobileViewport = useCallback(() => {
    zoomGestureRef.current.points.clear();
    zoomGestureRef.current.distance = 0;
    zoomGestureRef.current.zoom = 1;
    panGestureRef.current = null;
    setPinching(false);
    setMobileZoom(1);
    setMobilePan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!textEditing) return;
    zoomGestureRef.current.points.clear();
    zoomGestureRef.current.distance = 0;
    panGestureRef.current = null;
    setPinching(false);
  }, [textEditing]);

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") return;
      const gesture = zoomGestureRef.current;
      if (
        textEditing ||
        (event.target instanceof Element && event.target.closest("[data-canvas-text-editor]"))
      ) {
        // Native selection handles emit touch pointers from the textarea. They belong to the OS
        // text editor, not the canvas viewport; retaining one here can turn a cursor drag into a
        // pan or combine it with the next touch and accidentally change the canvas scale.
        gesture.points.clear();
        gesture.distance = 0;
        panGestureRef.current = null;
        setPinching(false);
        return;
      }

      gesture.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (gesture.points.size === 1 && mobileZoom > 1) {
        panGestureRef.current = null;
        const stage = stageRef.current;
        const point = stage?.getPointerPosition();
        // The background layer does not listen for input, so any hit is an editable layer or
        // transformer handle. Empty pixels are therefore safe to use for moving the viewport.
        const hitLayer = Boolean(point && stage?.getIntersection(point));
        if (!hitLayer) {
          panGestureRef.current = {
            pointerId: event.pointerId,
            start: { x: event.clientX, y: event.clientY },
            origin: mobilePan,
          };
          setPinching(true);
        }
        return;
      }
      if (gesture.points.size !== 2) return;

      panGestureRef.current = null;
      gesture.distance = pointerDistance(gesture.points);
      gesture.zoom = mobileZoom;
      setPinching(true);
    },
    [mobilePan, mobileZoom, textEditing],
  );

  const handleViewportPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") return;
      const gesture = zoomGestureRef.current;
      if (textEditing) {
        gesture.points.clear();
        gesture.distance = 0;
        panGestureRef.current = null;
        setPinching(false);
        return;
      }
      if (!gesture.points.has(event.pointerId)) return;
      gesture.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pan = panGestureRef.current;
      if (gesture.points.size === 1 && pan?.pointerId === event.pointerId) {
        event.preventDefault();
        setMobilePan(
          clampViewportPan(
            {
              x: pan.origin.x + event.clientX - pan.start.x,
              y: pan.origin.y + event.clientY - pan.start.y,
            },
            mobileZoom,
            stageAreaRef.current,
            stageWidth,
            spec,
          ),
        );
        return;
      }
      if (gesture.points.size !== 2 || gesture.distance <= 0) return;

      event.preventDefault();
      setMobileZoom(
        clampMobileZoom(gesture.zoom * (pointerDistance(gesture.points) / gesture.distance)),
      );
    },
    [mobileZoom, spec, stageWidth, textEditing],
  );

  const finishViewportPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    const gesture = zoomGestureRef.current;
    gesture.points.delete(event.pointerId);
    if (panGestureRef.current?.pointerId === event.pointerId) panGestureRef.current = null;
    if (gesture.points.size < 2) {
      gesture.distance = 0;
      setPinching(false);
    }
  }, []);

  const backgroundPicker = selectedSlide ? (
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
      onRestored={(imageVersion) =>
        setSlides((current) =>
          current.map((slide) =>
            slide.id === selectedSlide.id
              ? {
                  ...slide,
                  status: CAROUSEL_SLIDE_STATUS.COMPLETED,
                  hasImage: true,
                  imageVersion,
                }
              : slide,
          ),
        )
      }
    />
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-1 flex-col overflow-hidden bg-black lg:relative lg:inset-auto lg:z-auto lg:gap-4 lg:overflow-visible lg:bg-transparent">
      <div
        inert={busy}
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 text-white lg:hidden"
      >
        <button
          type="button"
          onClick={() => router.push("/posts")}
          aria-label="Back to posts"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center text-white/80 text-xs" aria-live="polite">
          {anyPending ? (
            "Preparing backgrounds…"
          ) : anyFailed ? (
            <span className="text-red-300">A background needs attention</span>
          ) : saveFailed ? (
            <button type="button" onClick={() => void flush()} className="text-red-300 underline">
              Save failed — retry
            </button>
          ) : editor.dirty ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" /> Saving changes…
            </span>
          ) : (
            "All changes saved"
          )}
        </div>
        <button
          type="button"
          onClick={() => void handlePreview()}
          disabled={busy || anyPending || slides.length === 0}
          aria-label="Preview the carousel"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
        >
          {previewing ? <Loader2 className="size-5 animate-spin" /> : <Eye className="size-5" />}
        </button>
        <Button
          onClick={handlePublish}
          disabled={busy || anyPending || anyFailed || slides.length === 0}
          className="h-11 shrink-0 rounded-full bg-white px-4 text-black hover:bg-white/90"
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="mr-1 size-4" />
          )}
          Done
        </Button>
      </div>

      <div
        inert={busy}
        className="hidden shrink-0 flex-wrap items-start justify-between gap-2 border-b pb-4 lg:flex"
      >
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="hidden text-muted-foreground text-xs underline-offset-2 hover:underline lg:block"
        >
          Press{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            Ctrl+Shift+?
          </kbd>{" "}
          for keyboard shortcuts
        </button>
        <div className="grid w-full grid-cols-2 items-center gap-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
          {anyPending && (
            <span className="col-span-2 text-muted-foreground text-xs lg:col-span-1">
              Waiting for backgrounds…
            </span>
          )}
          {!anyPending && anyFailed && (
            <span className="col-span-2 text-destructive text-xs lg:col-span-1">
              A background failed — regenerate it before completing
            </span>
          )}
          {saveFailed ? (
            <button
              type="button"
              onClick={() => void flush()}
              className="col-span-2 text-destructive text-xs underline-offset-2 hover:underline lg:col-span-1"
            >
              Couldn't save — retry
            </button>
          ) : (
            <span
              aria-live="polite"
              className="col-span-2 flex items-center gap-1 text-muted-foreground text-xs lg:col-span-1"
            >
              {editor.dirty ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Saved
                </>
              )}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setMobileControlsOpen(true)}
            disabled={busy}
            className="min-h-10 w-full lg:hidden"
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Controls
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={busy || anyPending || slides.length === 0}
            className="hidden min-h-10 lg:inline-flex"
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
          <Button
            onClick={handlePublish}
            disabled={busy || anyPending || anyFailed || slides.length === 0}
            className="min-h-10 w-full lg:w-auto"
          >
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

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6">
        <div
          inert={busy || mobileControlsOpen || mobileFontsOpen}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:gap-3"
        >
          {/** biome-ignore lint/a11y/noStaticElementInteractions: deselect mirrors the canvas's own click-away, and Esc already does it from the keyboard */}
          <div
            ref={stageAreaRef}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) editor.select(null);
            }}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={finishViewportPointer}
            onPointerCancel={finishViewportPointer}
            className="absolute inset-0 flex min-h-0 min-w-0 flex-1 touch-none items-center justify-center overflow-hidden lg:relative lg:touch-auto"
          >
            <div
              className={`lg:!transform-none shrink-0 origin-center overflow-hidden lg:rounded-lg ${
                pinching ? "" : "transition-transform duration-150 ease-out"
              }`}
              style={{
                width: stageWidth,
                transform: `translate3d(${mobilePan.x}px, ${mobilePan.y}px, 0) scale(${mobileZoom})`,
              }}
              data-testid="slide-stage"
            >
              <DesignStage
                document={editor.document}
                spec={spec}
                width={stageWidth}
                backgroundUrl={backgroundUrl}
                logoUrl={brandAssetUrl}
                selectedId={editor.selectedId}
                onSelect={editor.select}
                onLayerChange={editor.updateLayer}
                onLayerCommit={editor.commitLayer}
                onGestureEnd={editor.endGesture}
                onTextEditingChange={setTextEditing}
                resolveFontFamily={resolveFontFamily}
                stageRef={stageRef}
              />
            </div>
          </div>

          {mobileFilmstripOpen && (
            <button
              type="button"
              aria-label="Close slide previews"
              onClick={() => setMobileFilmstripOpen(false)}
              className="fixed inset-0 z-30 cursor-default lg:hidden"
            />
          )}

          <div
            className={`pointer-events-none absolute inset-x-0 z-40 flex items-center justify-start overflow-visible px-2 transition-[height,bottom] duration-300 ease-out lg:pointer-events-auto lg:static lg:z-auto lg:block lg:h-auto lg:p-0 ${
              mobileFilmstripOpen
                ? "bottom-[max(0.5rem,env(safe-area-inset-bottom))] h-[7.125rem]"
                : "bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.125rem)] h-12"
            }`}
          >
            <div
              className={`pointer-events-auto relative flex min-h-12 max-w-full items-center overflow-hidden rounded-2xl bg-primary/95 text-primary-foreground shadow-xl backdrop-blur-xl transition-[width,height] duration-300 ease-out lg:h-auto lg:min-h-0 lg:w-full lg:overflow-visible lg:rounded-none lg:bg-transparent lg:text-foreground lg:shadow-none lg:backdrop-blur-none ${
                mobileFilmstripOpen ? "h-full w-full" : "h-12 w-12"
              }`}
            >
              <button
                type="button"
                aria-label={mobileFilmstripOpen ? "Hide slide previews" : "Show slide previews"}
                aria-expanded={mobileFilmstripOpen}
                onClick={() => setMobileFilmstripOpen((open) => !open)}
                className="absolute top-1 left-1 z-10 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-colors lg:hidden"
              >
                {mobileFilmstripOpen ? (
                  <ChevronLeft className="size-5" />
                ) : (
                  <ChevronRight className="size-5" />
                )}
              </button>
              <div
                className={`min-w-0 flex-1 px-12 transition-opacity duration-200 lg:pointer-events-auto lg:px-0 lg:opacity-100 ${
                  mobileFilmstripOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <SlideFilmstrip
                  slides={filmstrip}
                  selectedId={frozenSelectionId ?? selectedSlideId}
                  onSelect={selectSlide}
                  canvas={spec}
                  centerSignal={mobileFilmstripOpen}
                  logoUrl={brandAssetUrl}
                  resolveFontFamily={resolveFontFamily}
                />
              </div>
            </div>
          </div>

          <MobileEditorToolbar
            layer={selectedLayer}
            busy={busy || platingAll}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            visible={!mobileFilmstripOpen}
            zoom={mobileZoom}
            canAddLogo={Boolean(logoAssetId)}
            onAddText={() => editor.addTextLayer("body", "Inter", "#ffffff")}
            onAddShape={() => editor.addShapeLayer("#000000")}
            onAddLogo={() => logoAssetId && editor.addLogoLayer(logoAssetId)}
            onUndo={editor.undo}
            onRedo={editor.redo}
            onResetZoom={resetMobileViewport}
            onChange={(patch) => editor.selectedId && editor.updateLayer(editor.selectedId, patch)}
            onToggleHighlight={(on) => void togglePlate(on)}
            onDuplicate={() => editor.selectedId && editor.duplicateLayer(editor.selectedId)}
            onDelete={() => editor.selectedId && editor.deleteLayer(editor.selectedId)}
            onRaise={() => editor.selectedId && editor.raiseLayer(editor.selectedId)}
            onLower={() => editor.selectedId && editor.lowerLayer(editor.selectedId)}
            onOpenDetails={() => setMobileControlsOpen(true)}
            onOpenFonts={() => setMobileFontsOpen(true)}
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
              disabled={!editor.canUndo || platingAll}
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
              disabled={!editor.canRedo || platingAll}
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
            onTogglePlate={(on) => void togglePlate(on)}
          />

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="highlight-all"
                indeterminate={highlighting.some}
                checked={highlighting.all}
                disabled={busy || platingAll}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  void applyHighlightToAll(event.target.checked)
                }
              />
              <Label htmlFor="highlight-all">Highlight text on every slide</Label>
              {platingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </div>
            <p className="text-muted-foreground text-xs">
              Applies to every text block in the carousel.
            </p>
          </div>

          {backgroundPicker}
        </div>
        <MobileOptionsSheet
          open={mobileControlsOpen}
          onClose={() => setMobileControlsOpen(false)}
          layer={selectedLayer}
          busy={busy}
          platingAll={platingAll}
          highlightAll={highlighting}
          onChange={(patch) => editor.selectedId && editor.updateLayer(editor.selectedId, patch)}
          onHighlightAll={(on) => void applyHighlightToAll(on)}
        >
          {backgroundPicker}
        </MobileOptionsSheet>
        <MobileFontSheet
          open={mobileFontsOpen && selectedLayer?.type === "text"}
          onClose={() => setMobileFontsOpen(false)}
          value={selectedLayer?.type === "text" ? selectedLayer.fontFamily : ""}
          fonts={fonts}
          onSelect={(fontFamily) =>
            editor.selectedId && editor.updateLayer(editor.selectedId, { fontFamily })
          }
        />
      </div>
      <BlockingOverlay
        active={busy}
        className="z-50"
        title={
          initializing
            ? "Preparing slide layouts…"
            : saving
              ? "Saving slide…"
              : publishing && !renderProgress
                ? "Uploading slides…"
                : "Rendering slides…"
        }
        description={
          renderProgress ? `Slide ${renderProgress.current} of ${renderProgress.total}` : undefined
        }
      />

      <CarouselPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDone={() => void handlePublish()}
        doneDisabled={anyPending || anyFailed || slides.length === 0}
        slides={previewSlides}
        canvas={spec}
      />

      <ShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function clampMobileZoom(value: number): number {
  return Math.min(MAX_MOBILE_ZOOM, Math.max(MIN_MOBILE_ZOOM, Math.round(value * 100) / 100));
}

function clampViewportPan(
  pan: { x: number; y: number },
  zoom: number,
  area: HTMLDivElement | null,
  stageWidth: number,
  spec: { width: number; height: number },
): { x: number; y: number } {
  if (!area || zoom <= 1) return { x: 0, y: 0 };

  const box = area.getBoundingClientRect();
  const stageHeight = (stageWidth * spec.height) / spec.width;
  const maxX = Math.max(0, (stageWidth * zoom - box.width) / 2);
  const maxY = Math.max(0, (stageHeight * zoom - box.height) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

function pointerDistance(points: Map<number, { x: number; y: number }>): number {
  const [first, second] = [...points.values()];
  return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
}

function useFittedStageWidth(
  areaRef: React.RefObject<HTMLDivElement | null>,
  spec: { width: number; height: number },
): number {
  const [width, setWidth] = useState(INITIAL_STAGE_WIDTH);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const query = window.matchMedia?.("(min-width: 1024px)");
    const resizeStage = (box: { width: number; height: number }) => {
      const widthForHeight = (box.height * spec.width) / spec.height;
      const fitted =
        (query?.matches ?? window.innerWidth >= 1024)
          ? Math.min(box.width, widthForHeight)
          : Math.max(box.width, widthForHeight);
      setWidth(Math.max(1, Math.floor(fitted)));
    };
    const observer = new ResizeObserver(([entry]) => resizeStage(entry.contentRect));
    const handleBreakpoint = () => resizeStage(area.getBoundingClientRect());
    observer.observe(area);
    query?.addEventListener("change", handleBreakpoint);

    return () => {
      observer.disconnect();
      query?.removeEventListener("change", handleBreakpoint);
    };
  }, [areaRef, spec.width, spec.height]);

  return width;
}

/**
 * The slide row owns its background image, so the document only carries the solid colour drawn
 * underneath it. Storing the path here too would go stale the moment it is regenerated.
 */
function documentFor(slide: EditorSlide): DesignDocument {
  return parseDesignDocument(slide.design)?.document ?? EMPTY_DOCUMENT;
}

/** Two frames: one for React to commit the new document, one for Konva to draw it. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
