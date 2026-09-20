"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasSpec } from "@/lib/design/canvas-spec";

const INITIAL_STAGE_WIDTH = 420;
const MIN_MOBILE_ZOOM = 0.75;
const MAX_MOBILE_ZOOM = 2.5;

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

    const resizeStage = (box: { width: number; height: number }) => {
      const widthForHeight = (box.height * spec.width) / spec.height;
      const fitted = Math.min(box.width, widthForHeight);
      setWidth(Math.max(1, Math.floor(fitted)));
    };
    const observer = new ResizeObserver(([entry]) => resizeStage(entry.contentRect));
    observer.observe(area);

    return () => observer.disconnect();
  }, [areaRef, spec.width, spec.height]);

  return width;
}

export interface StageViewport {
  areaRef: React.RefObject<HTMLDivElement | null>;
  stageWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  pinching: boolean;
  reset: () => void;
  handlers: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  };
}

/**
 * Pinch-zoom and one-finger pan for the phone viewport, applied as a CSS transform on the
 * wrapper rather than to the stage, so Konva's own coordinates never move.
 */
export function useStageViewport(
  spec: CanvasSpec,
  stageRef: React.RefObject<Konva.Stage | null>,
  textEditing: boolean,
): StageViewport {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pinching, setPinching] = useState(false);
  const stageWidth = useFittedStageWidth(areaRef, spec);

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

  useEffect(() => {
    setPan((current) => clampViewportPan(current, zoom, areaRef.current, stageWidth, spec));
  }, [zoom, spec, stageWidth]);

  const reset = useCallback(() => {
    zoomGestureRef.current.points.clear();
    zoomGestureRef.current.distance = 0;
    zoomGestureRef.current.zoom = 1;
    panGestureRef.current = null;
    setPinching(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!textEditing) return;
    zoomGestureRef.current.points.clear();
    zoomGestureRef.current.distance = 0;
    panGestureRef.current = null;
    setPinching(false);
  }, [textEditing]);

  const onPointerDown = useCallback(
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
      if (gesture.points.size === 1 && zoom > 1) {
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
            origin: pan,
          };
          setPinching(true);
        }
        return;
      }
      if (gesture.points.size !== 2) return;

      panGestureRef.current = null;
      gesture.distance = pointerDistance(gesture.points);
      gesture.zoom = zoom;
      setPinching(true);
    },
    [pan, zoom, stageRef, textEditing],
  );

  const onPointerMove = useCallback(
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
      const active = panGestureRef.current;
      if (gesture.points.size === 1 && active?.pointerId === event.pointerId) {
        event.preventDefault();
        setPan(
          clampViewportPan(
            {
              x: active.origin.x + event.clientX - active.start.x,
              y: active.origin.y + event.clientY - active.start.y,
            },
            zoom,
            areaRef.current,
            stageWidth,
            spec,
          ),
        );
        return;
      }
      if (gesture.points.size !== 2 || gesture.distance <= 0) return;

      event.preventDefault();
      setZoom(clampMobileZoom(gesture.zoom * (pointerDistance(gesture.points) / gesture.distance)));
    },
    [zoom, spec, stageWidth, textEditing],
  );

  const finish = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    const gesture = zoomGestureRef.current;
    gesture.points.delete(event.pointerId);
    if (panGestureRef.current?.pointerId === event.pointerId) panGestureRef.current = null;
    if (gesture.points.size < 2) {
      gesture.distance = 0;
      setPinching(false);
    }
  }, []);

  return {
    areaRef,
    stageWidth,
    zoom,
    pan,
    pinching,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
