"use client";

import type { Platform } from "@prisma/client";
import { ArrowLeft, Check, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  brandAssetUrl,
  builtinFontChoices,
  registerBrandFont,
  resolveFontFamily,
} from "@/app/(app)/brand/lib/font-catalogue";
import { DesignEditor } from "@/components/design/DesignEditor";
import type {
  DesignEditorErrorKind,
  DesignEditorHandle,
  DesignEditorSlotContext,
} from "@/components/design/design-editor-contract";
import { BackgroundPicker } from "@/components/posts/carousel/BackgroundPicker";
import {
  CarouselPreviewDialog,
  type PreviewSlide,
} from "@/components/posts/carousel/CarouselPreviewDialog";
import { type FilmstripSlide, SlideFilmstrip } from "@/components/posts/carousel/SlideFilmstrip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { carouselCanvas } from "@/lib/carousel/platform-spec";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { documentFrom, EMPTY_DOCUMENT } from "@/lib/design/document";
import { uploadedFontFamily } from "@/lib/design/fonts";
import { POLLING } from "@/lib/polling-config";
import { responseError } from "@/lib/utils";

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

const CAROUSEL_LABELS = { page: "slide", pages: "Slides" };

const AUTOSAVE_DELAY_MS = 1000;
const SAVE_TOAST_ID = "slide-save";

const ERROR_MESSAGES: Record<DesignEditorErrorKind, string> = {
  save: "Failed to save slide",
  prepare: "Failed to prepare slide layouts",
  restyle: "Failed to update every slide",
};

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
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewSlides, setPreviewSlides] = useState<PreviewSlide[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const editorRef = useRef<DesignEditorHandle | null>(null);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const initialDocuments = useMemo(
    () => Object.fromEntries(initialSlides.map((slide) => [slide.id, documentFrom(slide.design)])),
    [initialSlides],
  );

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

  const pages = useMemo(
    () =>
      orderedSlides.map((slide) => ({ id: slide.id, backgroundUrl: slideBackgroundUrl(slide) })),
    [orderedSlides, slideBackgroundUrl],
  );

  const persistDesign = useCallback(
    async (pageId: string, design: Parameters<typeof JSON.stringify>[0]) => {
      const res = await fetch(`/api/posts/${postId}/carousel/slides/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      });
      if (!res.ok) throw await responseError(res, "Failed to save slide");
    },
    [postId],
  );

  const reportError = useCallback((err: unknown, kind: DesignEditorErrorKind) => {
    const message = err instanceof Error ? err.message : ERROR_MESSAGES[kind];
    toast.error(message, kind === "save" ? { id: SAVE_TOAST_ID } : undefined);
  }, []);

  const slideById = useCallback(
    (id: string) => orderedSlides.find((slide) => slide.id === id),
    [orderedSlides],
  );

  async function handlePreview() {
    setPreviewing(true);
    try {
      const rendered = await editorRef.current?.exportPages();
      if (!rendered) return;

      setPreviewSlides(
        rendered.map(({ pageId, blob }) => {
          const slide = slideById(pageId);
          return {
            id: pageId,
            order: slide?.order ?? 0,
            headline: slide?.headline ?? null,
            url: URL.createObjectURL(blob),
          };
        }),
      );
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to render the preview");
    } finally {
      setPreviewing(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const rendered = await editorRef.current?.exportPages();
      if (!rendered) {
        setPublishing(false);
        return;
      }

      const form = new FormData();
      for (const { pageId, blob } of rendered) {
        form.append("slides", blob, `${(slideById(pageId)?.order ?? 0) + 1}.png`);
      }

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
      setPublishing(false);
    }
  }

  const renderSelectedBackgroundPicker = (ctx: DesignEditorSlotContext) => {
    const slide = ctx.displayPageId ? slideById(ctx.displayPageId) : undefined;
    if (!slide) return null;

    return (
      <BackgroundPicker
        postId={postId}
        slideId={slide.id}
        visualPrompt={slide.visualPrompt}
        status={slide.status}
        onRegenerated={() =>
          setSlides((current) =>
            current.map((candidate) =>
              candidate.id === slide.id
                ? { ...candidate, status: CAROUSEL_SLIDE_STATUS.GENERATING }
                : candidate,
            ),
          )
        }
        onRestored={(imageVersion) =>
          setSlides((current) =>
            current.map((candidate) =>
              candidate.id === slide.id
                ? {
                    ...candidate,
                    status: CAROUSEL_SLIDE_STATUS.COMPLETED,
                    hasImage: true,
                    imageVersion,
                  }
                : candidate,
            ),
          )
        }
      />
    );
  };

  const canRender = !anyPending && slides.length > 0;

  return (
    <>
      <DesignEditor
        pages={pages}
        initialDocuments={initialDocuments}
        spec={spec}
        labels={CAROUSEL_LABELS}
        ref={editorRef}
        assets={{
          fonts,
          resolveFontFamily,
          assetUrl: brandAssetUrl,
          logoAssetId,
          loadFonts: () =>
            Promise.all(uploadedFonts.map((font) => registerBrandFont(font.assetId))).then(
              () => {},
            ),
        }}
        persistence={{ savePage: persistDesign, autosaveDelayMs: AUTOSAVE_DELAY_MS }}
        busy={
          publishing
            ? { active: true, title: "Rendering slides…" }
            : previewing
              ? { active: true, title: "Rendering slides…" }
              : undefined
        }
        onError={reportError}
        renderHeader={(ctx) =>
          ctx.layout === "mobile" ? (
            <MobileHeader
              ctx={ctx}
              anyPending={anyPending}
              anyFailed={anyFailed}
              previewing={previewing}
              publishing={publishing}
              canRender={canRender}
              onBack={() => router.push("/posts")}
              onPreview={() => void handlePreview()}
              onPublish={() => void handlePublish()}
            />
          ) : (
            <DesktopHeader
              ctx={ctx}
              anyPending={anyPending}
              anyFailed={anyFailed}
              previewing={previewing}
              publishing={publishing}
              canRender={canRender}
              onPreview={() => void handlePreview()}
              onPublish={() => void handlePublish()}
            />
          )
        }
        renderPageStrip={(ctx) => (
          <SlideFilmstrip
            slides={filmstripSlides(orderedSlides, ctx, slideBackgroundUrl)}
            selectedId={ctx.displayPageId}
            onSelect={ctx.openPage}
            canvas={spec}
            centerSignal={false}
            logoUrl={brandAssetUrl}
            resolveFontFamily={resolveFontFamily}
          />
        )}
        renderPageOptions={(ctx) => (
          <>
            <HighlightAllControl ctx={ctx} surface={ctx.surface} />
            {renderSelectedBackgroundPicker(ctx)}
          </>
        )}
      />

      <CarouselPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDone={() => void handlePublish()}
        doneDisabled={anyPending || anyFailed || slides.length === 0}
        slides={previewSlides}
        canvas={spec}
      />
    </>
  );
}

function filmstripSlides(
  slides: EditorSlide[],
  ctx: DesignEditorSlotContext,
  backgroundUrl: (slide: EditorSlide) => string | null,
): FilmstripSlide[] {
  return slides.map((slide) => ({
    id: slide.id,
    order: slide.order,
    headline: slide.headline,
    status: slide.status,
    hasImage: slide.hasImage,
    imageUrl: backgroundUrl(slide),
    document: ctx.documents[slide.id] ?? EMPTY_DOCUMENT,
  }));
}

function HighlightAllControl({
  ctx,
  surface,
}: {
  ctx: DesignEditorSlotContext;
  surface: "panel" | "sheet";
}) {
  const id = `${surface}-highlight-all`;

  return (
    <div className={surface === "panel" ? "space-y-2 border-t pt-4" : "space-y-2"}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          indeterminate={ctx.highlightAll.some}
          checked={ctx.highlightAll.all}
          disabled={ctx.busy}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            ctx.highlightAll.apply(event.target.checked)
          }
        />
        <Label htmlFor={id}>Highlight text on every slide</Label>
        {ctx.highlightAll.pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
      {surface === "panel" && (
        <p className="text-muted-foreground text-xs">
          Applies to every text block in the carousel.
        </p>
      )}
    </div>
  );
}

interface HeaderProps {
  ctx: DesignEditorSlotContext;
  anyPending: boolean;
  anyFailed: boolean;
  previewing: boolean;
  publishing: boolean;
  canRender: boolean;
  onPreview: () => void;
  onPublish: () => void;
}

function MobileHeader({
  ctx,
  anyPending,
  anyFailed,
  previewing,
  publishing,
  canRender,
  onBack,
  onPreview,
  onPublish,
}: HeaderProps & { onBack: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
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
        ) : ctx.save.state === "failed" ? (
          <button type="button" onClick={ctx.save.retry} className="text-red-300 underline">
            Save failed — retry
          </button>
        ) : ctx.save.state === "saving" ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Saving changes…
          </span>
        ) : (
          "All changes saved"
        )}
      </div>
      <button
        type="button"
        onClick={onPreview}
        disabled={ctx.busy || !canRender}
        aria-label="Preview the carousel"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/50 backdrop-blur-md disabled:opacity-40"
      >
        {previewing ? <Loader2 className="size-5 animate-spin" /> : <Eye className="size-5" />}
      </button>
      <Button
        onClick={onPublish}
        disabled={ctx.busy || !canRender || anyFailed}
        className="h-11 shrink-0 rounded-full bg-white px-4 text-black hover:bg-white/90"
      >
        {publishing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="mr-1 size-4" />
        )}
        Done
      </Button>
    </>
  );
}

function DesktopHeader({
  ctx,
  anyPending,
  anyFailed,
  previewing,
  publishing,
  canRender,
  onPreview,
  onPublish,
}: HeaderProps) {
  return (
    <>
      <button
        type="button"
        onClick={ctx.showShortcuts}
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
        {ctx.save.state === "failed" ? (
          <button
            type="button"
            onClick={ctx.save.retry}
            className="col-span-2 text-destructive text-xs underline-offset-2 hover:underline lg:col-span-1"
          >
            Couldn't save — retry
          </button>
        ) : (
          <span
            aria-live="polite"
            className="col-span-2 flex items-center gap-1 text-muted-foreground text-xs lg:col-span-1"
          >
            {ctx.save.state === "saving" ? (
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
          onClick={onPreview}
          disabled={ctx.busy || !canRender}
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
          onClick={onPublish}
          disabled={ctx.busy || !canRender || anyFailed}
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
    </>
  );
}
