"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";

export interface FilmstripSlide {
  id: string;
  order: number;
  headline: string | null;
  status: string;
  hasImage: boolean;
  imageUrl: string | null;
}

interface SlideFilmstripProps {
  slides: FilmstripSlide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canvas: { width: number; height: number };
}

const THUMB_WIDTH = 80;
const GAP = 8;
const VISIBLE_SLOTS = 7;

export function SlideFilmstrip({ slides, selectedId, onSelect, canvas }: SlideFilmstripProps) {
  const ordered = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const selectedIndex = Math.max(
    ordered.findIndex((slide) => slide.id === selectedId),
    0,
  );

  const thumbHeight = Math.round((THUMB_WIDTH * canvas.height) / canvas.width);
  const trackOffset = selectedIndex * (THUMB_WIDTH + GAP) + THUMB_WIDTH / 2;

  return (
    <div
      className="relative mx-auto w-full max-w-full shrink-0 overflow-clip [mask-image:linear-gradient(to_right,transparent_0%,#000_18%,#000_82%,transparent_100%)]"
      style={{
        maxWidth: VISIBLE_SLOTS * (THUMB_WIDTH + GAP) - GAP,
        height: thumbHeight + 8,
      }}
    >
      <div
        className="absolute top-1 left-1/2 flex transition-transform duration-300 ease-out"
        style={{ gap: GAP, transform: `translateX(-${trackOffset}px)` }}
      >
        {ordered.map((slide) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onSelect(slide.id)}
            data-testid="filmstrip-slide"
            className={`relative shrink-0 overflow-hidden rounded-md border-2 text-left transition-all duration-300 ${
              selectedId === slide.id
                ? "border-primary opacity-100"
                : "border-border opacity-60 hover:opacity-100"
            }`}
            style={{ width: THUMB_WIDTH }}
            title={slide.headline ?? `Slide ${slide.order + 1}`}
          >
            <div
              className="relative bg-muted"
              style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
            >
              {slide.imageUrl && (
                // Plain img: the slide backgrounds are proxied API routes, not optimisable assets.
                // biome-ignore lint/performance/noImgElement: API-served bytes, not a static asset
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                {slide.status === CAROUSEL_SLIDE_STATUS.GENERATING ||
                slide.status === CAROUSEL_SLIDE_STATUS.PENDING ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white drop-shadow" />
                ) : slide.status === CAROUSEL_SLIDE_STATUS.FAILED ? (
                  <AlertCircle className="h-4 w-4 text-destructive drop-shadow" />
                ) : null}
              </div>
              <span className="absolute bottom-0.5 left-1 font-medium text-[10px] text-white drop-shadow">
                {slide.order + 1}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
