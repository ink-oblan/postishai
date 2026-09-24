"use client";

import type { MouseEvent, PointerEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SCRUB_HOLD_MS = 260;
const SCRUB_EDGE_PX = 48;
const SCRUB_EDGE_SPEED = 14;
const PAN_SLOP_PX = 5;

interface StripDrag {
  pointerId: number;
  startX: number;
  x: number;
  y: number;
  scrollLeft: number;
  panned: boolean;
  scrubbing: boolean;
}

function thumbKeyAt(x: number, y: number): string | null {
  const thumb = document.elementFromPoint?.(x, y)?.closest<HTMLElement>("[data-thumb]");
  return thumb?.dataset.thumb ?? null;
}

interface StripProps {
  ref: RefObject<HTMLDivElement | null>;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
}

export interface ThumbScrub {
  stripRef: RefObject<HTMLDivElement | null>;
  stripProps: StripProps;
  scrubbing: boolean;
  isScrubbing: () => boolean;
  shouldIgnoreClick: () => boolean;
}

export function useThumbScrub(onScrub: (key: string) => void, enabled = true): ThumbScrub {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<StripDrag | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeFrame = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const scrub = useRef(onScrub);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    scrub.current = onScrub;
  });

  const end = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (edgeFrame.current !== null) cancelAnimationFrame(edgeFrame.current);
    edgeFrame.current = null;

    const current = drag.current;
    drag.current = null;
    if (current) ignoreClick.current = current.panned || current.scrubbing;
    if (stripRef.current) stripRef.current.style.scrollBehavior = "";
    setScrubbing(false);
  }, []);

  useEffect(() => end, [end]);

  const followEdges = useCallback(() => {
    const strip = stripRef.current;
    const current = drag.current;
    if (!strip || !current?.scrubbing) {
      edgeFrame.current = null;
      return;
    }

    const rect = strip.getBoundingClientRect();
    const fromLeft = current.x - rect.left;
    const fromRight = rect.right - current.x;
    const past =
      fromLeft < SCRUB_EDGE_PX
        ? fromLeft - SCRUB_EDGE_PX
        : fromRight < SCRUB_EDGE_PX
          ? SCRUB_EDGE_PX - fromRight
          : 0;

    if (past !== 0) {
      strip.scrollLeft += (past / SCRUB_EDGE_PX) * SCRUB_EDGE_SPEED;
      const key = thumbKeyAt(current.x, current.y);
      if (key !== null) scrub.current(key);
    }
    edgeFrame.current = requestAnimationFrame(followEdges);
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const strip = stripRef.current;
      if (!strip) return;
      event.stopPropagation();

      ignoreClick.current = false;
      strip.style.scrollBehavior = "auto";
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        x: event.clientX,
        y: event.clientY,
        scrollLeft: strip.scrollLeft,
        panned: false,
        scrubbing: false,
      };

      const held = (event.target as HTMLElement).closest<HTMLElement>("[data-thumb]")?.dataset
        .thumb;
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        const current = drag.current;
        if (!current) return;
        current.scrubbing = true;
        setScrubbing(true);
        if (held !== undefined) scrub.current(held);
        edgeFrame.current = requestAnimationFrame(followEdges);
      }, SCRUB_HOLD_MS);
    },
    [followEdges],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    current.x = event.clientX;
    current.y = event.clientY;

    if (current.scrubbing) {
      const key = thumbKeyAt(event.clientX, event.clientY);
      if (key !== null) scrub.current(key);
      return;
    }

    const dx = event.clientX - current.startX;
    if (!current.panned && Math.abs(dx) <= PAN_SLOP_PX) return;
    if (!current.panned) {
      current.panned = true;
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (stripRef.current) stripRef.current.scrollLeft = current.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      end();
    },
    [end],
  );

  const isScrubbing = useCallback(() => Boolean(drag.current?.scrubbing), []);

  const shouldIgnoreClick = useCallback(() => {
    if (!ignoreClick.current) return false;
    ignoreClick.current = false;
    return true;
  }, []);

  return {
    stripRef,
    stripProps: enabled
      ? {
          ref: stripRef,
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: end,
          onContextMenu: (event: MouseEvent) => event.preventDefault(),
        }
      : { ref: stripRef },
    scrubbing,
    isScrubbing,
    shouldIgnoreClick,
  };
}

interface SlideThumbProps {
  thumbKey: string;
  selected: boolean;
  lifted?: boolean;
  width: number;
  badge: number;
  label: string;
  title?: string;
  tone?: "panel" | "overlay";
  testId?: string;
  onClick: () => void;
  children: ReactNode;
}

export function SlideThumb({
  thumbKey,
  selected,
  lifted,
  width,
  badge,
  label,
  title,
  tone = "panel",
  testId,
  onClick,
  children,
}: SlideThumbProps) {
  return (
    <button
      type="button"
      data-thumb={thumbKey}
      data-testid={testId}
      aria-label={label}
      aria-current={selected}
      title={title}
      onClick={onClick}
      style={{ width }}
      className={cn(
        "relative shrink-0 select-none overflow-hidden rounded-md border-2 text-left transition-[opacity,transform,border-color] duration-300 [-webkit-touch-callout:none] [-webkit-user-drag:none]",
        selected && "border-primary opacity-100",
        !selected && tone === "overlay" && "border-white/40 opacity-60",
        !selected && tone === "panel" && "border-border opacity-60 hover:opacity-100",
        selected && lifted && "scale-110",
      )}
    >
      {children}
      <span className="absolute bottom-0.5 left-1 font-medium text-[10px] text-white drop-shadow">
        {badge}
      </span>
    </button>
  );
}
