"use client";

import { Dialog } from "@base-ui/react";
import { Check, ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideThumb, useThumbScrub } from "@/components/posts/carousel/SlideThumb";
import { Button } from "@/components/ui/button";
import { cn, wrapIndex } from "@/lib/utils";

function arrowDelta(key: string): number | null {
  if (key === "ArrowRight") return 1;
  if (key === "ArrowLeft") return -1;
  return null;
}

const SWIPE_THRESHOLD_PX = 40;
const DRAG_CAPTURE_PX = 5;
const EDGE_RESISTANCE = 3;
const TAP_SLOP_PX = 5;
const THUMB_WIDTH = 52;
const CHROME_HINT_MS = 1000;

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  dx: number;
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
  /** Given, the phone-sized preview offers to finish the post instead of only closing. */
  onDone?: () => void;
  doneDisabled?: boolean;
}

export function CarouselPreviewDialog({
  open,
  onOpenChange,
  slides,
  canvas,
  onDone,
  doneDisabled,
}: CarouselPreviewDialogProps) {
  const [index, setIndex] = useState(0);
  const [chromeOpen, setChromeOpen] = useState(false);

  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopHint = useCallback(() => {
    if (hintTimer.current !== null) clearTimeout(hintTimer.current);
    hintTimer.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setChromeOpen(true);
    hintTimer.current = setTimeout(() => setChromeOpen(false), CHROME_HINT_MS);
    return stopHint;
  }, [open, stopHint]);

  const clamped = Math.min(index, Math.max(slides.length - 1, 0));

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => wrapIndex(i + delta, slides.length));
    },
    [slides.length],
  );

  const scrub = useThumbScrub((key) => {
    const next = Number(key);
    if (Number.isInteger(next)) setIndex(next);
  });

  useEffect(() => {
    if (scrub.isScrubbing()) return;
    const strip = scrub.stripRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-thumb="${clamped}"]`);
    if (!strip || !thumb) return;
    strip.scrollLeft = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
  }, [clamped, scrub.isScrubbing, scrub.stripRef]);

  const [drag, setDrag] = useState<Drag | null>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (event.buttons === 0) {
      setDrag(null);
      return;
    }

    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > DRAG_CAPTURE_PX) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      stopHint();
      setChromeOpen(false);
    }
    setDrag({ ...drag, dx });
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setDrag(null);

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) <= TAP_SLOP_PX && Math.abs(dy) <= TAP_SLOP_PX) {
      stopHint();
      setChromeOpen((visible) => !visible);
      return;
    }
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    const target = clamped + (dx < 0 ? 1 : -1);
    if (target >= 0 && target < slides.length) setIndex(target);
  }

  const dragOffset = (() => {
    if (!drag) return 0;
    const pastEdge =
      (clamped === 0 && drag.dx > 0) || (clamped === slides.length - 1 && drag.dx < 0);
    return pastEdge ? drag.dx / EDGE_RESISTANCE : drag.dx;
  })();

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:gap-8 lg:bg-transparent"
        >
          <Dialog.Title className="sr-only">Preview</Dialog.Title>
          <Dialog.Description className="sr-only" data-testid="preview-counter">
            Slide {clamped + 1} of {slides.length}
          </Dialog.Description>

          <Dialog.Close
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Close preview"
                className="absolute top-3 right-3 z-10 hidden rounded-full lg:top-0 lg:right-0 lg:inline-flex"
              />
            }
          >
            <X />
          </Dialog.Close>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous slide"
            onClick={() => step(-1)}
            className="hidden rounded-full lg:inline-flex lg:size-10"
          >
            <ChevronLeft />
          </Button>

          <div className="relative h-full w-full lg:aspect-[440/900] lg:h-[min(calc(100dvh-4rem),820px)] lg:w-auto">
            <div
              data-testid="preview-screen"
              onPointerDown={(event) => {
                setDrag({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0 });
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setDrag(null)}
              className="flex h-full w-full touch-none select-none flex-col items-center justify-center overflow-hidden bg-black [-webkit-touch-callout:none] lg:absolute lg:top-[1.78%] lg:left-[5%] lg:h-[96.44%] lg:w-[90%] lg:rounded-[13.89%/6.34%]"
            >
              <div
                data-testid="preview-frame"
                className="relative max-h-full w-full overflow-hidden"
                style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
              >
                {/* Every slide stays mounted in the strip: swapping one <img>'s src leaves the frame
                    empty for a frame or two while the next PNG decodes. */}
                <div
                  data-testid="preview-track"
                  className={`flex h-full ${
                    drag
                      ? ""
                      : "transition-transform duration-300 ease-out motion-reduce:transition-none"
                  }`}
                  style={{ transform: `translateX(calc(${-clamped * 100}% + ${dragOffset}px))` }}
                >
                  {slides.map((slide, i) => (
                    // biome-ignore lint/performance/noImgElement: blob URL of a freshly rasterised slide
                    <img
                      key={slide.id}
                      src={slide.url}
                      alt={slide.headline ?? `Slide ${slide.order + 1}`}
                      aria-hidden={i !== clamped}
                      className="h-full w-full shrink-0 object-contain"
                      draggable={false}
                    />
                  ))}
                </div>

                <div
                  {...scrub.stripProps}
                  onPointerDown={(event) => {
                    stopHint();
                    scrub.stripProps.onPointerDown?.(event);
                  }}
                  data-testid="preview-strip"
                  role="toolbar"
                  aria-label="Slides"
                  className={cn(
                    "absolute inset-x-0 bottom-0 z-10 flex touch-none overflow-x-auto overscroll-x-contain scroll-smooth bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 transition-opacity duration-200 [scrollbar-width:none] lg:opacity-100 [&::-webkit-scrollbar]:hidden",
                    chromeOpen
                      ? "opacity-100"
                      : "pointer-events-none opacity-0 lg:pointer-events-auto",
                  )}
                >
                  <div className="mx-auto flex w-max gap-2">
                    {slides.map((slide, i) => (
                      <SlideThumb
                        key={slide.id}
                        thumbKey={String(i)}
                        selected={i === clamped}
                        lifted={scrub.scrubbing}
                        width={THUMB_WIDTH}
                        badge={i + 1}
                        label={`Go to slide ${i + 1}`}
                        tone="overlay"
                        onClick={() => {
                          stopHint();
                          if (!scrub.shouldIgnoreClick()) setIndex(i);
                        }}
                      >
                        {/* biome-ignore lint/performance/noImgElement: blob URL of a freshly rasterised slide */}
                        <img
                          src={slide.url}
                          alt=""
                          aria-hidden
                          draggable={false}
                          className="pointer-events-none block w-full select-none object-cover"
                          style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                        />
                      </SlideThumb>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {onDone && (
              <div
                data-testid="preview-actions"
                className={cn(
                  "absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10 transition-opacity duration-200 lg:hidden",
                  chromeOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-11 rounded-full border-white/30 bg-black/50 px-4 text-white backdrop-blur-md hover:bg-black/70 hover:text-white"
                >
                  <Pencil className="mr-1.5 size-4" />
                  Keep editing
                </Button>
                <Button
                  type="button"
                  disabled={doneDisabled}
                  onClick={() => {
                    onOpenChange(false);
                    onDone();
                  }}
                  className="h-11 rounded-full bg-white px-4 text-black hover:bg-white/90"
                >
                  <Check className="mr-1.5 size-4" />
                  Done
                </Button>
              </div>
            )}

            {/* biome-ignore lint/performance/noImgElement: decorative static SVG overlay */}
            <img
              src="/static/phone-frame.svg"
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute inset-0 hidden h-full w-full select-none lg:block"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next slide"
            onClick={() => step(1)}
            className="hidden rounded-full lg:inline-flex lg:size-10"
          >
            <ChevronRight />
          </Button>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
