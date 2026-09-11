"use client";

import { Dialog } from "@base-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { wrapIndex } from "@/lib/utils";

function arrowDelta(key: string): number | null {
  if (key === "ArrowRight") return 1;
  if (key === "ArrowLeft") return -1;
  return null;
}

export interface PreviewSlide {
  id: string;
  order: number;
  headline: string | null;
  url: string;
}

interface CarouselPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: PreviewSlide[];
  canvas: { width: number; height: number };
}

export function CarouselPreviewDialog({
  open,
  onOpenChange,
  slides,
  canvas,
}: CarouselPreviewDialogProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const clamped = Math.min(index, Math.max(slides.length - 1, 0));
  const current = slides[clamped] ?? null;

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => wrapIndex(i + delta, slides.length));
    },
    [slides.length],
  );

  // Both paths are needed: the popup handler catches the common case where focus sits inside the
  // dialog and the keypress never reaches the window, the window listener catches the keypress
  // once focus has fallen back to the body. `defaultPrevented` keeps them from both firing.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const delta = arrowDelta(event.key);
      if (!delta) return;

      event.preventDefault();
      step(delta);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, step]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          onKeyDown={(event) => {
            const delta = arrowDelta(event.key);
            if (!delta) return;

            event.preventDefault();
            step(delta);
          }}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:p-6"
        >
          <div className="flex items-baseline justify-between gap-3">
            <Dialog.Title className="font-semibold text-base">Preview</Dialog.Title>
            <span className="text-muted-foreground text-xs" data-testid="preview-counter">
              Slide {clamped + 1} of {slides.length}
            </span>
          </div>
          <Dialog.Description className="mt-1 text-muted-foreground text-sm">
            Exactly what gets published, rendered at {canvas.width}×{canvas.height}.
          </Dialog.Description>

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Previous slide"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div
              className="relative flex-1 overflow-hidden rounded-lg bg-muted"
              style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
            >
              {current && (
                // biome-ignore lint/performance/noImgElement: blob URL of a freshly rasterised slide
                <img
                  src={current.url}
                  alt={current.headline ?? `Slide ${current.order + 1}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Next slide"
              onClick={() => step(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {current?.headline && (
            <p className="mt-3 text-center text-muted-foreground text-sm">{current.headline}</p>
          )}

          <div className="mt-3 flex justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === clamped ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close render={<Button variant="outline" size="sm" />}>Close</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
