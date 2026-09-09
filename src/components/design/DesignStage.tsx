"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { type CanvasSpec, coverCrop, safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer as DesignLayer } from "@/lib/design/document";

const MIN_LAYER_SIZE = 24;

/** Nodes the editor draws for itself, which must never appear in an exported image. */
export const EDITOR_CHROME_NAME = "editor-chrome";
export const BACKGROUND_NODE_NAME = "slide-background";

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
  showSafeZone = true,
  stageRef,
  resolveFontFamily = (name) => name,
}: DesignStageProps) {
  const scale = width / spec.width;
  const height = spec.height * scale;

  const background = useImage(backgroundUrl);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const area = safeArea(spec);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = selectedId ? nodeRefs.current.get(selectedId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId]);

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
      return (
        <Text
          key={layer.id}
          {...common}
          ref={register(layer.id)}
          text={layer.text}
          width={layer.width}
          height={layer.height}
          fontFamily={resolveFontFamily(layer.fontFamily)}
          fontSize={layer.fontSize}
          fontStyle={String(layer.fontWeight)}
          lineHeight={layer.lineHeight}
          align={layer.align}
          fill={layer.color}
          wrap="word"
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
    <Stage
      ref={stageRef}
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
          ignoreStroke
          borderStrokeWidth={2 / scale}
          anchorSize={10 / scale}
          anchorStrokeWidth={1 / scale}
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
