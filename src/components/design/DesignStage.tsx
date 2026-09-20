"use client";

import type Konva from "konva";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { type CanvasSpec, coverCrop } from "@/lib/design/canvas-spec";
import {
  type DesignDocument,
  type Layer as DesignLayer,
  fontStyleOf,
  type TextLayer,
  textDecorationOf,
} from "@/lib/design/document";
import { ensureFontsLoaded, facesUsedBy, remeasureText } from "@/lib/design/fonts";
import { PLACEHOLDER_BASE, PLACEHOLDER_BLOBS, PLACEHOLDER_FADE } from "@/lib/design/placeholder";

const MIN_LAYER_SIZE = 24;

const ANCHOR_RATIO = 0.008;
const MIN_ANCHOR_PX = 3;
const MAX_ANCHOR_PX = 5;
const MOBILE_ANCHOR_PX = 9;

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

interface LoadedImage {
  url: string | null;
  image: HTMLImageElement | null;
  status: "loading" | "loaded" | "error";
}

interface SettledImage {
  url: string;
  image: HTMLImageElement | null;
  status: "loaded" | "error";
}

function useImage(url: string | null): LoadedImage {
  const [settled, setSettled] = useState<SettledImage | null>(null);

  useEffect(() => {
    if (!url) return;

    const element = new window.Image();
    element.crossOrigin = "anonymous";
    let cancelled = false;
    element.onload = () => {
      if (!cancelled) setSettled({ url, image: element, status: "loaded" });
    };
    element.onerror = () => {
      if (!cancelled) setSettled({ url, image: null, status: "error" });
    };
    element.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return { url: null, image: null, status: "error" };
  if (settled?.url === url) return settled;

  /**
   * Switching slides swaps the URL a frame before the next photograph has decoded, and dropping
   * the old one there is what made the slide flash its flat background mid-swipe. The previous
   * asset stays on screen until the new one is ready; export is unaffected, since
   * `waitForBackground` and `waitForLogos` match the node's image by src rather than by presence.
   */
  return { url, image: settled?.image ?? null, status: "loading" };
}

const identityFontFamily = (name: string) => name;

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
  onLayerCommit: (id: string, patch: Partial<DesignLayer>) => void;
  /** Closes that streaming run, so the next edit starts a fresh undo step. */
  onGestureEnd: () => void;
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
  stageRef,
  resolveFontFamily = identityFontFamily,
}: DesignStageProps) {
  const scale = width / spec.width;
  const height = spec.height * scale;
  const [mobileHandles, setMobileHandles] = useState(false);
  const anchor = mobileHandles
    ? MOBILE_ANCHOR_PX
    : Math.min(Math.max(width * ANCHOR_RATIO, MIN_ANCHOR_PX), MAX_ANCHOR_PX);

  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 1023px) and (pointer: coarse)");
    const update = () =>
      setMobileHandles(
        query?.matches ?? (window.innerWidth < 1024 && window.navigator.maxTouchPoints > 0),
      );
    update();
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, []);

  const { image: background } = useImage(backgroundUrl);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const plateRefs = useRef(new Map<string, Konva.Rect>());

  /**
   * Konva owns the height of a text box, and a rewrap changes it without ever going through the
   * document — so a plate sized from the layer's stored height would drift the moment anyone
   * retyped. It is measured off the node that actually drew instead, which also keeps it under
   * the copy mid-drag, before the new position has been committed.
   */
  const syncPlates = useCallback(() => {
    for (const layer of document.layers) {
      if (layer.type !== "text" || !layer.background) continue;

      const text = nodeRefs.current.get(layer.id);
      const plate = plateRefs.current.get(layer.id);
      if (!text || !plate) continue;

      const pad = layer.background.padding;
      plate.setAttrs({
        x: text.x(),
        y: text.y(),
        rotation: text.rotation(),
        // Offset puts the pivot back on the text's own origin, so a rotation matches.
        offsetX: pad,
        offsetY: pad,
        width: text.width() * text.scaleX() + pad * 2,
        height: text.height() * text.scaleY() + pad * 2,
      });
    }
  }, [document.layers]);

  useEffect(syncPlates);

  const localStageRef = useRef<Konva.Stage | null>(null);
  const attachStage = useCallback(
    (node: Konva.Stage | null) => {
      localStageRef.current = node;
      if (stageRef) stageRef.current = node;
    },
    [stageRef],
  );

  const faces = useMemo(
    () => facesUsedBy(document, resolveFontFamily),
    [document, resolveFontFamily],
  );
  const facesRef = useRef(faces);
  facesRef.current = faces;
  const facesKey = useMemo(
    () => faces.map((face) => `${face.family}|${face.weight}|${face.italic}`).join(","),
    [faces],
  );

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
      syncPlates();
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
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const canvasOriginRef = useRef<{ left: number; top: number } | null>(null);
  const keyboardBaselineRef = useRef(0);
  const editorHeightRef = useRef(0);
  const [keyboardFocus, setKeyboardFocus] = useState<{
    x: number;
    y: number;
    zoom: number;
  } | null>(null);

  const updateKeyboardFocus = useCallback(
    (editorHeight = editorHeightRef.current) => {
      editorHeightRef.current = editorHeight;
      const viewport = window.visualViewport;
      const root = canvasRootRef.current;
      if (!viewport || !root || !editingLayer) return;

      keyboardBaselineRef.current = Math.max(keyboardBaselineRef.current, viewport.height);
      const keyboardOpen = viewport.height < keyboardBaselineRef.current - 80;
      if (!keyboardOpen) {
        setKeyboardFocus(null);
        return;
      }

      if (!canvasOriginRef.current) {
        const bounds = root.getBoundingClientRect();
        canvasOriginRef.current = { left: bounds.left, top: bounds.top };
      }

      const origin = canvasOriginRef.current;
      const layerWidth = editingLayer.width * scale;
      const layerCenterX = (editingLayer.x + editingLayer.width / 2) * scale;
      const layerCenterY = editingLayer.y * scale + editorHeight / 2;
      const zoom = Math.min(1.35, Math.max(1.15, (viewport.width * 0.82) / layerWidth));
      const targetX = viewport.width / 2;
      const targetY = viewport.offsetTop + viewport.height / 2;

      const nextFocus = {
        x: targetX - origin.left - layerCenterX * zoom,
        y: targetY - origin.top - layerCenterY * zoom,
        zoom,
      };
      setKeyboardFocus((current) =>
        current &&
        Math.abs(current.x - nextFocus.x) < 0.5 &&
        Math.abs(current.y - nextFocus.y) < 0.5 &&
        Math.abs(current.zoom - nextFocus.zoom) < 0.001
          ? current
          : nextFocus,
      );
    },
    [editingLayer, scale],
  );

  // Selecting something else — or deleting the layer outright — leaves the editor behind.
  useEffect(() => {
    if (editingId && !editingLayer) {
      setEditingId(null);
      onGestureEnd();
    }
  }, [editingId, editingLayer, onGestureEnd]);

  useEffect(() => {
    if (!editingLayer) {
      canvasOriginRef.current = null;
      keyboardBaselineRef.current = 0;
      editorHeightRef.current = 0;
      setKeyboardFocus(null);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;
    keyboardBaselineRef.current = Math.max(keyboardBaselineRef.current, viewport.height);
    const update = () => updateKeyboardFocus();
    // On iOS the keyboard can resize visualViewport during the same commit that focuses the
    // textarea, before this listener is attached. Poll briefly as the keyboard animates so the
    // first focused frame is corrected even when that initial resize event was missed.
    let framesLeft = 36;
    let frame = 0;
    const followKeyboard = () => {
      update();
      framesLeft -= 1;
      if (framesLeft > 0) frame = requestAnimationFrame(followKeyboard);
    };
    frame = requestAnimationFrame(followKeyboard);
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [editingLayer, updateKeyboardFocus]);

  useLayoutEffect(() => {
    if (!keyboardFocus) return;
    const frame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const root = canvasRootRef.current;
      const textarea = root?.querySelector("textarea");
      if (!viewport || !root || !textarea) return;

      const bounds = textarea.getBoundingClientRect();
      const targetX = viewport.offsetLeft + viewport.width / 2;
      const targetY = viewport.offsetTop + viewport.height / 2;
      const parent = root.parentElement;
      const parentScale = parent?.offsetWidth
        ? parent.getBoundingClientRect().width / parent.offsetWidth
        : 1;
      const correctionX = (targetX - (bounds.left + bounds.width / 2)) / parentScale;
      const correctionY = (targetY - (bounds.top + bounds.height / 2)) / parentScale;
      if (Math.abs(correctionX) < 0.5 && Math.abs(correctionY) < 0.5) return;

      setKeyboardFocus((current) =>
        current ? { ...current, x: current.x + correctionX, y: current.y + correctionY } : current,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboardFocus]);

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
   * A text box only has a wrap width to resize: its height follows the copy. Update the Konva node
   * directly while the handle is moving so the copy wraps without a React render rebinding the
   * Transformer underneath the user's finger. The document receives one edit when the drag ends.
   */
  function resizeTextWidth(layer: TextLayer, done: boolean) {
    const node = nodeRefs.current.get(layer.id);
    if (!node) return;

    const width = Math.max(MIN_LAYER_SIZE, node.width() * node.scaleX());
    node.setAttrs({ width, scaleX: 1, scaleY: 1 });

    if (done) onLayerChange(layer.id, { x: node.x(), y: node.y(), width });
  }

  function beginTextEdit(layer: TextLayer) {
    // Capture the full-height viewport before focusing the textarea can summon the keyboard.
    keyboardBaselineRef.current = Math.max(
      keyboardBaselineRef.current,
      window.visualViewport?.height ?? window.innerHeight,
    );
    onSelect(layer.id);
    setEditingId(layer.id);
  }

  function endTextEdit() {
    setEditingId(null);
    onGestureEnd();
  }

  function register(id: string) {
    return (node: Konva.Node | null) => {
      if (node) nodeRefs.current.set(id, node);
      else nodeRefs.current.delete(id);
    };
  }

  function registerPlate(id: string) {
    return (node: Konva.Rect | null) => {
      if (node) plateRefs.current.set(id, node);
      else plateRefs.current.delete(id);
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
        <Fragment key={layer.id}>
          {layer.background && (
            <Rect
              ref={registerPlate(layer.id)}
              fill={layer.background.color}
              opacity={layer.background.opacity}
              cornerRadius={layer.background.cornerRadius}
              // Geometry is applied by `syncPlates` against the text node's real measurements.
              listening={false}
            />
          )}
          <Text
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
            onTap={() => {
              if (selectedId === layer.id) beginTextEdit(layer);
              else onSelect(layer.id);
            }}
            onDblClick={() => beginTextEdit(layer)}
            onDblTap={() => beginTextEdit(layer)}
            onDragMove={syncPlates}
            onTransform={() => {
              resizeTextWidth(layer, false);
              syncPlates();
            }}
            onTransformEnd={() => resizeTextWidth(layer, true)}
            listening
          />
        </Fragment>
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
    <div
      ref={canvasRootRef}
      className="relative"
      style={
        keyboardFocus
          ? {
              transform: `translate3d(${keyboardFocus.x}px, ${keyboardFocus.y}px, 0) scale(${keyboardFocus.zoom})`,
              transformOrigin: "top left",
            }
          : undefined
      }
    >
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
            anchorCornerRadius={anchor / 2 / scale}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN_LAYER_SIZE || newBox.height < MIN_LAYER_SIZE ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>

      {editingLayer && (
        <TextLayerEditor
          key={editingLayer.id}
          layer={editingLayer}
          scale={scale}
          fontFamily={resolveFontFamily(editingLayer.fontFamily)}
          onInput={(text) => onLayerCommit(editingLayer.id, { text } as Partial<DesignLayer>)}
          onClose={endTextEdit}
          onLayout={updateKeyboardFocus}
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
  onLayout,
}: {
  layer: TextLayer;
  scale: number;
  fontFamily: string;
  onInput: (text: string) => void;
  onClose: () => void;
  onLayout: (height: number) => void;
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
    onLayout(element.scrollHeight);
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
  const { image, status } = useImage(url);

  if (!image) {
    return (
      <Rect
        {...common}
        imageLoadStatus={status}
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
      imageLoadStatus={status}
      ref={register}
      image={image}
      width={layer.width}
      height={layer.height}
    />
  );
}
