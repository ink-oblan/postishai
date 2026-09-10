"use client";

import { AlertCircle, Loader2 } from "lucide-react";
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
  aspectRatio: string;
}

export function SlideFilmstrip({ slides, selectedId, onSelect, aspectRatio }: SlideFilmstripProps) {
  return (
    <div className="shrink-0 overflow-x-auto pb-2">
      <div className="mx-auto flex w-max gap-2">
        {slides.map((slide) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onSelect(slide.id)}
            data-testid="filmstrip-slide"
            className={`relative w-20 shrink-0 overflow-hidden rounded-md border-2 text-left transition-all ${
              selectedId === slide.id ? "border-primary" : "border-border hover:border-primary/40"
            }`}
            title={slide.headline ?? `Slide ${slide.order + 1}`}
          >
            <div className="relative bg-muted" style={{ aspectRatio }}>
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
