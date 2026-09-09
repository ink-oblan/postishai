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

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  role: TextRole;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  align: TextAlign;
  color: string;
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  fill: string;
  cornerRadius: number;
  opacity: number;
}

export interface LogoLayer extends LayerBase {
  type: "logo";
  assetId: string;
}

export type Layer = TextLayer | ShapeLayer | LogoLayer;

export type Background =
  | { kind: "image"; imagePath: string; crop?: { x: number; y: number; w: number; h: number } }
  | { kind: "solid"; color: string };

export interface Overlay {
  color: string;
  opacity: number;
}

export interface DesignDocument {
  background: Background;
  overlay?: Overlay;
  layers: Layer[];
}

const TEXT_ALIGNS: readonly TextAlign[] = ["left", "center", "right"];
const TEXT_ROLES: readonly TextRole[] = ["heading", "body"];

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

    return {
      ...base,
      type: "text",
      text,
      role: TEXT_ROLES.includes(raw.role as TextRole) ? (raw.role as TextRole) : "body",
      fontFamily,
      fontSize: clamp(fontSize, 8, 400),
      fontWeight: clamp(num(raw.fontWeight) ?? 400, 100, 900),
      lineHeight: clamp(num(raw.lineHeight) ?? 1.2, 0.5, 4),
      align: TEXT_ALIGNS.includes(raw.align as TextAlign) ? (raw.align as TextAlign) : "left",
      color,
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

function parseOverlay(raw: unknown): Overlay | undefined {
  if (!isRecord(raw)) return undefined;
  const color = str(raw.color);
  const opacity = num(raw.opacity);
  if (!color || opacity === undefined) return undefined;

  return { color, opacity: clamp(opacity, 0, 1) };
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

  const overlay = parseOverlay(value.overlay);

  return { document: { background, ...(overlay ? { overlay } : {}), layers }, dropped };
}
