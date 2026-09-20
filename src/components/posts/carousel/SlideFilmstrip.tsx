"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DesignPreview } from "@/components/design/DesignPreview";
import { SlideThumb, useThumbScrub } from "@/components/posts/carousel/SlideThumb";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";

export interface FilmstripSlide {
  id: string;
  order: number;
  headline: string | null;
  status: string;
  hasImage: boolean;
  imageUrl: string | null;
  document: DesignDocument;
}

interface SlideFilmstripProps {
  slides: FilmstripSlide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canvas: CanvasSpec;
  centerSignal?: unknown;
  logoUrl?: (assetId: string) => string;
  resolveFontFamily?: (name: string) => string;
}

const THUMB_WIDTH = 80;
const MOBILE_THUMB_WIDTH = 52;
const THUMB_BORDER = 2;
const GAP = 8;
const VISIBLE_SLOTS = 7;

export function SlideFilmstrip({
  slides,
  selectedId,
  onSelect,
  canvas,
  centerSignal,
  logoUrl,
  resolveFontFamily,
}: SlideFilmstripProps) {
  const [desktop, setDesktop] = useState(false);
  const { stripRef, stripProps, scrubbing, isScrubbing, shouldIgnoreClick } = useThumbScrub(
    onSelect,
    !desktop,
  );
  const ordered = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const selectedIndex = Math.max(
    ordered.findIndex((slide) => slide.id === selectedId),
    0,
  );

  const thumbWidth = desktop ? THUMB_WIDTH : MOBILE_THUMB_WIDTH;
  const thumbHeight = Math.round((thumbWidth * canvas.height) / canvas.width);
  const trackOffset = selectedIndex * (thumbWidth + GAP) + thumbWidth / 2;

  useEffect(() => {
    const query = window.matchMedia?.("(min-width: 1024px)");
    const update = () => setDesktop(query?.matches ?? window.innerWidth >= 1024);
    update();
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, []);

  const centerSelected = useCallback(() => {
    const filmstrip = stripRef.current;
    const node = filmstrip?.querySelector<HTMLElement>(`[data-thumb="${selectedId}"]`);
    if (!desktop && !isScrubbing() && node && filmstrip) {
      // Only move the horizontal strip. scrollIntoView would also jump the whole page down to
      // the thumbnails when the editor first mounts on a phone.
      filmstrip.scrollLeft = node.offsetLeft - (filmstrip.clientWidth - node.clientWidth) / 2;
    }
  }, [desktop, isScrubbing, selectedId, stripRef]);

  useEffect(() => {
    centerSelected();
  }, [centerSelected]);

  useEffect(() => {
    if (desktop || !centerSignal) return;
    const frame = requestAnimationFrame(centerSelected);
    const afterExpansion = window.setTimeout(centerSelected, 320);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(afterExpansion);
    };
  }, [centerSelected, centerSignal, desktop]);

  return (
    <div
      {...stripProps}
      role="toolbar"
      aria-label="Slides"
      className={`relative mx-auto w-full max-w-full shrink-0 ${
        desktop
          ? "overflow-clip [mask-image:linear-gradient(to_right,transparent_0%,#000_18%,#000_82%,transparent_100%)]"
          : "touch-none overflow-x-auto overscroll-x-contain scroll-smooth"
      }`}
      style={{
        maxWidth: VISIBLE_SLOTS * (THUMB_WIDTH + GAP) - GAP,
        height: thumbHeight + 8,
      }}
    >
      <div
        className={
          desktop
            ? "absolute top-1 left-1/2 flex transition-transform duration-300 ease-out"
            : "mx-auto flex w-max py-1"
        }
        style={{ gap: GAP, transform: desktop ? `translateX(-${trackOffset}px)` : undefined }}
      >
        {ordered.map((slide) => (
          <SlideThumb
            key={slide.id}
            thumbKey={slide.id}
            selected={slide.id === selectedId}
            lifted={scrubbing}
            width={thumbWidth}
            badge={slide.order + 1}
            label={slide.headline ?? `Slide ${slide.order + 1}`}
            title={slide.headline ?? `Slide ${slide.order + 1}`}
            testId="filmstrip-slide"
            onClick={() => {
              if (!shouldIgnoreClick()) onSelect(slide.id);
            }}
          >
            <div
              className="relative bg-muted"
              style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
            >
              <DesignPreview
                document={slide.document}
                spec={canvas}
                width={thumbWidth - THUMB_BORDER * 2}
                backgroundUrl={slide.imageUrl}
                logoUrl={logoUrl}
                resolveFontFamily={resolveFontFamily}
                className="pointer-events-none"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {slide.status === CAROUSEL_SLIDE_STATUS.GENERATING ||
                slide.status === CAROUSEL_SLIDE_STATUS.PENDING ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white drop-shadow" />
                ) : slide.status === CAROUSEL_SLIDE_STATUS.FAILED ? (
                  <AlertCircle className="h-4 w-4 text-destructive drop-shadow" />
                ) : null}
              </div>
            </div>
          </SlideThumb>
        ))}
      </div>
    </div>
  );
}
