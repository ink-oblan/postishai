export type LayerType = "text" | "shape" | "logo";

export type TextRole = "heading" | "body";

export type TextAlign = "left" | "center" | "right";

export interface LayerBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Drawn as a plate behind one text block, which is what keeps light copy legible over a
 * photograph nobody chose. It hangs off the layer rather than sitting beside it as a shape so
 * that reflow — which refuses to touch a document holding anything but text — keeps running,
 * and so the plate follows the copy through a rewrap, a shrink or a drag without being synced.
 */
export interface TextBackground {
  color: string;
  opacity: number;
  padding: number;
  cornerRadius: number;
}

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  role: TextRole;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  lineThrough: boolean;
  lineHeight: number;
  align: TextAlign;
  color: string;
  background?: TextBackground;
}

/** Konva takes the weight and the slant as one string, in CSS `font` shorthand order. */
export function fontStyleOf(layer: TextLayer): string {
  return layer.italic ? `italic ${layer.fontWeight}` : String(layer.fontWeight);
}

/** Konva reads both decorations out of one space-separated string, as CSS does. */
export function textDecorationOf(layer: TextLayer): string {
  const decorations: string[] = [];
  if (layer.underline) decorations.push("underline");
  if (layer.lineThrough) decorations.push("line-through");

  return decorations.join(" ");
}

export const REGULAR_WEIGHT = 400;
export const BOLD_WEIGHT = 700;

/**
 * Generated slides come in at whatever weight their layout asked for, so "bold" is a range
 * rather than one number — the editor's toggle then normalises onto the two weights it sets.
 */
export function isBold(weight: number): boolean {
  return weight >= 600;
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  fill: string;
  cornerRadius: number;
  opacity: number;
}

export interface LogoLayer extends LayerBase {
  type: "logo";
  /** Opaque to the editor: whoever hosts it resolves the id to a URL. */
  assetId: string;
}

export type Layer = TextLayer | ShapeLayer | LogoLayer;

export type Background =
  | { kind: "image"; imagePath: string; crop?: { x: number; y: number; w: number; h: number } }
  | { kind: "solid"; color: string };

export type StackAnchor = "top" | "middle" | "bottom";

/**
 * Carried by a slide whose text is still stacked the way the generator left it. The server has
 * no font metrics to lay out against, so it stacks against an estimate and leaves these two
 * numbers behind for the browser to restack with the real ones. It is dropped the moment the
 * layout is taken over by hand, which is what stops a restack from undoing someone's work.
 */
export interface AutoLayout {
  anchor: StackAnchor;
  gap: number;
}

export interface DesignDocument {
  background: Background;
  autoLayout?: AutoLayout;
  layers: Layer[];
}

export const EMPTY_DOCUMENT: DesignDocument = {
  background: { kind: "solid", color: "#111111" },
  layers: [],
};

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 400;

const TEXT_ALIGNS: readonly TextAlign[] = ["left", "center", "right"];
const TEXT_ROLES: readonly TextRole[] = ["heading", "body"];
const STACK_ANCHORS: readonly StackAnchor[] = ["top", "middle", "bottom"];

const MAX_LAYERS = 40;
const MAX_TEXT_LENGTH = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseBase(raw: Record<string, unknown>): LayerBase | undefined {
  const id = str(raw.id);
  const x = num(raw.x);
  const y = num(raw.y);
  const width = num(raw.width);
  const height = num(raw.height);
  if (id === undefined || x === undefined || y === undefined) return undefined;
  if (width === undefined || height === undefined || width <= 0 || height <= 0) return undefined;

  return { id, x, y, width, height, rotation: num(raw.rotation) ?? 0 };
}

/** Absent on anything saved before plates existed, which reads as text drawn straight on. */
function parseTextBackground(raw: unknown): TextBackground | undefined {
  if (!isRecord(raw)) return undefined;
  const color = str(raw.color);
  if (!color) return undefined;

  return {
    color,
    opacity: clamp(num(raw.opacity) ?? 1, 0, 1),
    padding: Math.max(0, num(raw.padding) ?? 0),
    cornerRadius: Math.max(0, num(raw.cornerRadius) ?? 0),
  };
}

function parseLayer(raw: unknown): Layer | undefined {
  if (!isRecord(raw)) return undefined;
  const base = parseBase(raw);
  if (!base) return undefined;

  if (raw.type === "text") {
    const text = typeof raw.text === "string" ? raw.text.slice(0, MAX_TEXT_LENGTH) : undefined;
    const fontFamily = str(raw.fontFamily);
    const fontSize = num(raw.fontSize);
    const color = str(raw.color);
    if (text === undefined || !fontFamily || fontSize === undefined || !color) return undefined;

    const background = parseTextBackground(raw.background);

    return {
      ...base,
      type: "text",
      text,
      role: TEXT_ROLES.includes(raw.role as TextRole) ? (raw.role as TextRole) : "body",
      fontFamily,
      fontSize: clamp(fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
      fontWeight: clamp(num(raw.fontWeight) ?? REGULAR_WEIGHT, 100, 900),
      // Absent in anything saved before these existed, which reads as unstyled.
      italic: raw.italic === true,
      underline: raw.underline === true,
      lineThrough: raw.lineThrough === true,
      lineHeight: clamp(num(raw.lineHeight) ?? 1.2, 0.5, 4),
      align: TEXT_ALIGNS.includes(raw.align as TextAlign) ? (raw.align as TextAlign) : "left",
      color,
      ...(background ? { background } : {}),
    };
  }

  if (raw.type === "shape") {
    const fill = str(raw.fill);
    if (!fill) return undefined;

    return {
      ...base,
      type: "shape",
      fill,
      cornerRadius: Math.max(0, num(raw.cornerRadius) ?? 0),
      opacity: clamp(num(raw.opacity) ?? 1, 0, 1),
    };
  }

  if (raw.type === "logo") {
    const assetId = str(raw.assetId);
    if (!assetId) return undefined;

    return { ...base, type: "logo", assetId };
  }

  return undefined;
}

function parseBackground(raw: unknown): Background | undefined {
  if (!isRecord(raw)) return undefined;

  if (raw.kind === "image") {
    const imagePath = str(raw.imagePath);
    if (!imagePath) return undefined;

    const crop = isRecord(raw.crop) ? raw.crop : undefined;
    const x = crop && num(crop.x);
    const y = crop && num(crop.y);
    const w = crop && num(crop.w);
    const h = crop && num(crop.h);
    const hasCrop =
      x !== undefined && y !== undefined && w !== undefined && h !== undefined && w > 0 && h > 0;

    return hasCrop
      ? { kind: "image", imagePath, crop: { x, y, w, h } }
      : { kind: "image", imagePath };
  }

  if (raw.kind === "solid") {
    const color = str(raw.color);
    return color ? { kind: "solid", color } : undefined;
  }

  return undefined;
}

function parseAutoLayout(raw: unknown): AutoLayout | undefined {
  if (!isRecord(raw)) return undefined;
  const gap = num(raw.gap);
  if (gap === undefined || !STACK_ANCHORS.includes(raw.anchor as StackAnchor)) return undefined;

  return { anchor: raw.anchor as StackAnchor, gap: clamp(gap, 0, 400) };
}

export interface ParsedDesign {
  document: DesignDocument;
  dropped: number;
}

/**
 * Tolerant by design: a layer this build cannot read is dropped rather than blanking the
 * whole image, and the count comes back so callers that care can say so.
 */
export function parseDesignDocument(value: unknown): ParsedDesign | undefined {
  if (!isRecord(value)) return undefined;

  const background = parseBackground(value.background);
  if (!background) return undefined;

  const rawLayers = Array.isArray(value.layers) ? value.layers.slice(0, MAX_LAYERS) : [];
  let dropped = Array.isArray(value.layers) ? value.layers.length - rawLayers.length : 0;

  const layers = rawLayers.flatMap((raw) => {
    const layer = parseLayer(raw);
    if (!layer) {
      dropped++;
      return [];
    }
    return [layer];
  });

  const autoLayout = parseAutoLayout(value.autoLayout);

  return {
    document: {
      background,
      ...(autoLayout ? { autoLayout } : {}),
      layers,
    },
    dropped,
  };
}

/** `parseDesignDocument` for callers that only want something drawable. */
export function documentFrom(value: unknown): DesignDocument {
  return parseDesignDocument(value)?.document ?? EMPTY_DOCUMENT;
}
