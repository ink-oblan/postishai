"use client";

import type Konva from "konva";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { type CanvasSpec, coverCrop, safeArea } from "@/lib/design/canvas-spec";
import {
  type DesignDocument,
  type Layer as DesignLayer,
  fontStyleOf,
  type TextLayer,
  textDecorationOf,
} from "@/lib/design/document";
import { ensureFontsLoaded, facesUsedBy, remeasureText } from "@/lib/design/fonts";

const MIN_LAYER_SIZE = 24;

const ANCHOR_RATIO = 0.008;
const MIN_ANCHOR_PX = 3;
const MAX_ANCHOR_PX = 5;

/** Text resizes along one axis only: the wrap width. Its height is whatever the copy needs. */
const TEXT_ANCHORS = ["middle-left", "middle-right"];

/** Nodes the editor draws for itself, which must never appear in an exported image. */
export const EDITOR_CHROME_NAME = "editor-chrome";
export const BACKGROUND_NODE_NAME = "slide-background";

/**
 * Text is picked up by its box rather than by its glyphs, so a click in the gap between two
 * letters still selects the layer — and an emptied text layer stays selectable.
 */
function hitBoundingBox(context: Konva.Context, shape: Konva.Shape) {
  context.beginPath();
  context.rect(0, 0, shape.width(), shape.height());
  context.closePath();
  context.fillStrokeShape(shape);
}

function useImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    const element = new window.Image();
    // Same-origin routes only; set explicitly so a misconfigured URL fails loudly at load
    // rather than silently tainting the canvas at export time.
    element.crossOrigin = "anonymous";
    let cancelled = false;
    element.onload = () => {
      if (!cancelled) setImage(element);
    };
    element.onerror = () => {
      if (!cancelled) setImage(null);
    };
    element.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return image;
}

interface DesignStageProps {
  document: DesignDocument;
  spec: CanvasSpec;
  width: number;
  backgroundUrl: string | null;
  logoUrl?: (assetId: string) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayerChange: (id: string, patch: Partial<DesignLayer>) => void;
  /** Streaming counterpart to `onLayerChange`, for on-canvas typing to fold into one undo step. */
  onLayerCommit?: (id: string, patch: Partial<DesignLayer>) => void;
  /** Closes that streaming run, so the next edit starts a fresh undo step. */
  onGestureEnd?: () => void;
  showSafeZone?: boolean;
  stageRef?: React.RefObject<Konva.Stage | null>;
  /** Maps a document's stored font name onto a CSS family the canvas can draw. */
  resolveFontFamily?: (name: string) => string;
}

export function DesignStage({
  document,
  spec,
  width,
  backgroundUrl,
  logoUrl,
  selectedId,
  onSelect,
  onLayerChange,
  onLayerCommit,
  onGestureEnd,
  showSafeZone = true,
  stageRef,
  resolveFontFamily = (name) => name,
}: DesignStageProps) {
  const scale = width / spec.width;
  const height = spec.height * scale;
  const anchor = Math.min(Math.max(width * ANCHOR_RATIO, MIN_ANCHOR_PX), MAX_ANCHOR_PX);

  const background = useImage(backgroundUrl);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const area = safeArea(spec);

  const localStageRef = useRef<Konva.Stage | null>(null);
  const attachStage = useCallback(
    (node: Konva.Stage | null) => {
      localStageRef.current = node;
      if (stageRef) stageRef.current = node;
    },
    [stageRef],
  );

  const faces = facesUsedBy(document, resolveFontFamily);
  const facesRef = useRef(faces);
  facesRef.current = faces;
  const facesKey = faces.map((face) => `${face.family}|${face.weight}|${face.italic}`).join(",");

  /**
   * A canvas does not pull a webfont the way the DOM does: Konva draws with whatever is loaded
   * at that moment, so a face nobody has rendered yet comes out in the fallback. Asking for it
   * here is what makes the slide show the typeface that was actually picked.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the face list, whose array identity changes every render
  useEffect(() => {
    let cancelled = false;

    void ensureFontsLoaded(facesRef.current).then(() => {
      const stage = localStageRef.current;
      if (cancelled || !stage) return;

      remeasureText(stage);
      transformerRef.current?.forceUpdate();
      stage.batchDraw();
    });

    return () => {
      cancelled = true;
    };
  }, [facesKey]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const selectedLayer = document.layers.find((layer) => layer.id === selectedId) ?? null;
  const editingLayer =
    editingId === selectedId && selectedLayer?.type === "text" ? selectedLayer : null;

  // Selecting something else — or deleting the layer outright — leaves the editor behind.
  useEffect(() => {
    if (editingId && !editingLayer) {
      setEditingId(null);
      onGestureEnd?.();
    }
  }, [editingId, editingLayer, onGestureEnd]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = selectedId && !editingId ? nodeRefs.current.get(selectedId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, editingId]);

  const crop = background
    ? coverCrop(background.naturalWidth, background.naturalHeight, spec)
    : null;

  /**
   * Konva reports a resize as a scale on the node. Folding it back into width/height and
   * resetting the scale keeps the document in plain design pixels — and, for text, means a
   * resize rewraps the copy instead of stretching the glyphs.
   */
  function handleTransformEnd(layer: DesignLayer) {
    const node = nodeRefs.current.get(layer.id);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    onLayerChange(layer.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(MIN_LAYER_SIZE, layer.width * scaleX),
      height: Math.max(MIN_LAYER_SIZE, layer.height * scaleY),
      rotation: node.rotation(),
    });
  }

  /**
   * A text box only has a wrap width to resize: its height follows the copy. Folding the scale
   * back on every tick — rather than once the gesture ends — is what stops Konva from drawing a
   * frame of stretched glyphs, so the drag reads as a rewrap instead of a squash.
   */
  function foldTextWidth(layer: TextLayer, done: boolean) {
    const node = nodeRefs.current.get(layer.id);
    if (!node) return;

    const width = Math.max(MIN_LAYER_SIZE, node.width() * node.scaleX());
    node.setAttrs({ width, scaleX: 1, scaleY: 1 });

    (onLayerCommit ?? onLayerChange)(layer.id, { x: node.x(), y: node.y(), width });
    if (done) onGestureEnd?.();
  }

  function beginTextEdit(layer: TextLayer) {
    onSelect(layer.id);
    setEditingId(layer.id);
  }

  function endTextEdit() {
    setEditingId(null);
    onGestureEnd?.();
  }

  function register(id: string) {
    return (node: Konva.Node | null) => {
      if (node) nodeRefs.current.set(id, node);
      else nodeRefs.current.delete(id);
    };
  }

  function renderLayer(layer: DesignLayer) {
    const common = {
      id: layer.id,
      x: layer.x,
      y: layer.y,
      rotation: layer.rotation,
      draggable: true,
      onMouseDown: () => onSelect(layer.id),
      onTap: () => onSelect(layer.id),
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) =>
        onLayerChange(layer.id, { x: event.target.x(), y: event.target.y() }),
      onTransformEnd: () => handleTransformEnd(layer),
    };

    if (layer.type === "text") {
      // Height is left to Konva: the box follows the copy, so no resize can squash the glyphs.
      return (
        <Text
          key={layer.id}
          {...common}
          ref={register(layer.id)}
          text={layer.text}
          width={layer.width}
          fontFamily={resolveFontFamily(layer.fontFamily)}
          fontSize={layer.fontSize}
          fontStyle={fontStyleOf(layer)}
          textDecoration={textDecorationOf(layer)}
          lineHeight={layer.lineHeight}
          align={layer.align}
          fill={layer.color}
          wrap="word"
          hitFunc={hitBoundingBox}
          visible={editingId !== layer.id}
          onDblClick={() => beginTextEdit(layer)}
          onDblTap={() => beginTextEdit(layer)}
          onTransform={() => foldTextWidth(layer, false)}
          onTransformEnd={() => foldTextWidth(layer, true)}
          listening
        />
      );
    }

    if (layer.type === "shape") {
      return (
        <Rect
          key={layer.id}
          {...common}
          ref={register(layer.id)}
          width={layer.width}
          height={layer.height}
          fill={layer.fill}
          cornerRadius={layer.cornerRadius}
          opacity={layer.opacity}
        />
      );
    }

    return (
      <LogoLayer
        key={layer.id}
        layer={layer}
        url={logoUrl?.(layer.assetId) ?? null}
        common={common}
        register={register(layer.id)}
      />
    );
  }

  return (
    <div className="relative">
      <Stage
        ref={attachStage}
        width={width}
        height={height}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) onSelect(null);
        }}
        onTouchStart={(event) => {
          if (event.target === event.target.getStage()) onSelect(null);
        }}
      >
        <Layer scaleX={scale} scaleY={scale} listening={false}>
          {/* The document's background is the fallback drawn until (or unless) an image loads. */}
          {background ? (
            <KonvaImage
              name={BACKGROUND_NODE_NAME}
              image={background}
              x={0}
              y={0}
              width={spec.width}
              height={spec.height}
              crop={
                crop ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height } : undefined
              }
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={spec.width}
              height={spec.height}
              fill={document.background.kind === "solid" ? document.background.color : "#111111"}
            />
          )}
          {/* A slide whose photograph is still on the wire reads as broken when left flat black. */}
          {backgroundUrl && !background && <BackgroundPlaceholder spec={spec} />}
          {document.overlay && (
            <Rect
              x={0}
              y={0}
              width={spec.width}
              height={spec.height}
              fill={document.overlay.color}
              opacity={document.overlay.opacity}
            />
          )}
        </Layer>

        <Layer scaleX={scale} scaleY={scale}>
          <Group>{document.layers.map(renderLayer)}</Group>
          <Transformer
            name={EDITOR_CHROME_NAME}
            ref={transformerRef}
            rotateEnabled={false}
            enabledAnchors={selectedLayer?.type === "text" ? TEXT_ANCHORS : undefined}
            ignoreStroke
            borderStrokeWidth={1 / scale}
            anchorSize={anchor / scale}
            anchorStrokeWidth={1 / scale}
            anchorCornerRadius={2 / scale}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN_LAYER_SIZE || newBox.height < MIN_LAYER_SIZE ? oldBox : newBox
            }
          />
        </Layer>

        {showSafeZone && (
          <Layer scaleX={scale} scaleY={scale} listening={false}>
            <Rect
              name={EDITOR_CHROME_NAME}
              x={area.x}
              y={area.y}
              width={area.width}
              height={area.height}
              stroke="#ffffff"
              opacity={0.25}
              dash={[12 / scale, 12 / scale]}
              strokeWidth={2 / scale}
            />
          </Layer>
        )}
      </Stage>

      {editingLayer && (
        <TextLayerEditor
          key={editingLayer.id}
          layer={editingLayer}
          scale={scale}
          fontFamily={resolveFontFamily(editingLayer.fontFamily)}
          onInput={(text) =>
            (onLayerCommit ?? onLayerChange)(editingLayer.id, { text } as Partial<DesignLayer>)
          }
          onClose={endTextEdit}
        />
      )}
    </div>
  );
}

/**
 * Editing happens in a textarea laid over the canvas rather than in Konva, which has no caret or
 * selection of its own. The styles mirror the Text node's so the copy does not jump on entry.
 */
function TextLayerEditor({
  layer,
  scale,
  fontFamily,
  onInput,
  onClose,
}: {
  layer: TextLayer;
  scale: number;
  fontFamily: string;
  onInput: (text: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  // Grows with the copy, matching the auto-height Text node underneath.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  });

  return (
    <textarea
      ref={ref}
      value={layer.text}
      spellCheck={false}
      onChange={(event) => onInput(event.target.value)}
      onBlur={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) {
          event.preventDefault();
          onClose();
        }
      }}
      style={{
        position: "absolute",
        left: layer.x * scale,
        top: layer.y * scale,
        width: layer.width * scale,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        transformOrigin: "left top",
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        boxShadow: "0 0 0 1px rgba(56,132,255,0.9)",
        overflow: "hidden",
        resize: "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily,
        fontSize: layer.fontSize * scale,
        fontWeight: layer.fontWeight,
        fontStyle: layer.italic ? "italic" : "normal",
        textDecoration: textDecorationOf(layer) || "none",
        lineHeight: layer.lineHeight,
        textAlign: layer.align,
        color: layer.color,
        caretColor: layer.color,
      }}
    />
  );
}

const PLACEHOLDER_BASE = "#1a1d24";
const PLACEHOLDER_FADE = "rgba(26,29,36,0)";
const PLACEHOLDER_BLOBS = [
  { x: 0.28, y: 0.22, radius: 0.85, color: "rgba(124,136,163,0.5)" },
  { x: 0.82, y: 0.8, radius: 0.7, color: "rgba(70,79,102,0.65)" },
];

/** Stands in for the photograph while it loads: dark enough that white copy still reads. */
function BackgroundPlaceholder({ spec }: { spec: CanvasSpec }) {
  const reach = Math.max(spec.width, spec.height);

  return (
    <>
      <Rect x={0} y={0} width={spec.width} height={spec.height} fill={PLACEHOLDER_BASE} />
      {PLACEHOLDER_BLOBS.map((blob) => {
        const centre = { x: spec.width * blob.x, y: spec.height * blob.y };
        return (
          <Rect
            key={blob.color}
            x={0}
            y={0}
            width={spec.width}
            height={spec.height}
            fillRadialGradientStartPoint={centre}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={centre}
            fillRadialGradientEndRadius={reach * blob.radius}
            fillRadialGradientColorStops={[0, blob.color, 1, PLACEHOLDER_FADE]}
          />
        );
      })}
    </>
  );
}

function LogoLayer({
  layer,
  url,
  common,
  register,
}: {
  layer: Extract<DesignLayer, { type: "logo" }>;
  url: string | null;
  common: Record<string, unknown>;
  register: (node: Konva.Node | null) => void;
}) {
  const image = useImage(url);

  if (!image) {
    return (
      <Rect
        {...common}
        ref={register}
        width={layer.width}
        height={layer.height}
        fill="#ffffff"
        opacity={0.15}
      />
    );
  }

  return (
    <KonvaImage
      {...common}
      ref={register}
      image={image}
      width={layer.width}
      height={layer.height}
    />
  );
}
