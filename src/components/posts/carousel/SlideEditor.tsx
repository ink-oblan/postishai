"use client";

import type Konva from "konva";
import { Check, ImageIcon, Loader2, Plus, Type, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { builtinFontChoices, resolveFontFamily } from "@/components/design/font-catalogue";
import { LayerInspector } from "@/components/design/LayerInspector";
import { rasterizeStage, waitForBackground } from "@/components/design/rasterize";
import { useDesignEditor } from "@/components/design/useDesignEditor";
import { BackgroundPicker } from "@/components/posts/carousel/BackgroundPicker";
import { type FilmstripSlide, SlideFilmstrip } from "@/components/posts/carousel/SlideFilmstrip";
import { Button } from "@/components/ui/button";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { type DesignDocument, parseDesignDocument } from "@/lib/design/document";
import { registerUploadedFont } from "@/lib/design/fonts";
import { POLLING } from "@/lib/polling-config";

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

const STAGE_WIDTH = 420;

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
  const stageRef = useRef<Konva.Stage | null>(null);

  const selectedSlide = slides.find((slide) => slide.id === selectedSlideId) ?? null;

  // Read once, on mount: the effect below is what swaps documents afterwards.
  const editor = useDesignEditor(documentFor(selectedSlide), spec);
  const { setDocument } = editor;

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
  }, [selectedSlideId, setDocument]);

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

  const saveDesign = useCallback(async () => {
    if (!selectedSlide) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/slides/${selectedSlide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: editor.document }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save slide");
      }
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
  }, [editor, postId, selectedSlide]);

  async function handlePublish() {
    if (editor.dirty && !(await saveDesign())) return;

    setPublishing(true);
    try {
      const form = new FormData();

      // Every slide has to be drawn to export it, and only one stage exists — so each slide is
      // selected in turn and rasterised once the stage has actually rendered it.
      for (const slide of [...slides].sort((a, b) => a.order - b.order)) {
        setSelectedSlideId(slide.id);
        const document = documentFor(slide);
        setDocument(document, { markClean: true });
        await nextPaint();

        const stage = stageRef.current;
        if (!stage) throw new Error("The editor canvas is not ready");

        await waitForBackground(stage, slideBackgroundUrl(slide));

        const blob = await rasterizeStage(stage, document, spec, resolveFontFamily);
        form.append("slides", blob, `${slide.order + 1}.png`);
      }

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
      setPublishing(false);
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

  return (
    <div className="space-y-4">
      <SlideFilmstrip
        slides={filmstrip}
        selectedId={selectedSlideId}
        onSelect={setSelectedSlideId}
        aspectRatio={`${spec.width} / ${spec.height}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <div
          className="mx-auto w-full lg:mx-0"
          style={{ maxWidth: STAGE_WIDTH }}
          data-testid="slide-stage"
        >
          <DesignStage
            document={editor.document}
            spec={spec}
            width={STAGE_WIDTH}
            backgroundUrl={backgroundUrl}
            logoUrl={logoAssetId ? (assetId) => `/api/brand-profile/file?id=${assetId}` : undefined}
            selectedId={editor.selectedId}
            onSelect={editor.select}
            onLayerChange={editor.updateLayer}
            resolveFontFamily={resolveFontFamily}
            stageRef={stageRef}
          />
        </div>

        <div className="space-y-5">
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
              onClick={editor.undo}
              disabled={!editor.canUndo}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Undo
            </Button>
          </div>

          <LayerInspector
            layer={selectedLayer}
            fonts={fonts}
            onChange={(patch) => editor.selectedId && editor.updateLayer(editor.selectedId, patch)}
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
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={saveDesign}
          disabled={saving || !editor.dirty}
        >
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save slide
        </Button>
        <Button onClick={handlePublish} disabled={publishing || anyPending}>
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
        {anyPending && (
          <span className="text-muted-foreground text-xs">Waiting for backgrounds…</span>
        )}
      </div>
    </div>
  );
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
