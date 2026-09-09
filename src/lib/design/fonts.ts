import type { FontItem } from "@/lib/brand-fields";

export interface ResolvedFont {
  /** What goes into a CSS `font-family` / Konva `fontFamily`. */
  family: string;
  /** Set for uploaded fonts, which need an `@font-face` before the canvas can draw them. */
  assetId?: string;
}

export const FALLBACK_FONT_FAMILY = "sans-serif";

/**
 * Uploaded fonts are registered under a name of our own making rather than the file's internal
 * one, which we never read — two uploads with the same internal family would otherwise collide.
 */
export function uploadedFontFamily(assetId: string): string {
  return `brandfont-${assetId}`;
}

export function brandAssetFontUrl(assetId: string): string {
  return `/api/brand-profile/file?id=${encodeURIComponent(assetId)}`;
}

export function resolveFont(
  item: FontItem | undefined,
  builtinFamily: (name: string) => string,
): ResolvedFont {
  if (!item) return { family: FALLBACK_FONT_FAMILY };

  if (item.source === "uploaded" && item.assetId) {
    return { family: uploadedFontFamily(item.assetId), assetId: item.assetId };
  }

  return { family: builtinFamily(item.name) };
}

/**
 * A heading/body pair from the brand's typography list. One font is a legitimate brand choice,
 * in which case both roles use it.
 */
export interface FontPair {
  heading: FontItem;
  body: FontItem;
}

export function pickFontPair(typography: FontItem[]): FontPair | null {
  if (typography.length === 0) return null;

  const [first, second] = typography;
  return { heading: first, body: second ?? first };
}

/**
 * Konva draws text through canvas `fillText`, which silently falls back to a default face when
 * the font is not loaded yet — a correctly sized export in the wrong typeface. Every rasterise
 * has to wait on this first.
 */
export async function ensureFontsLoaded(
  faces: { family: string; weight: number; size: number }[],
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all(
    faces.map((face) =>
      document.fonts.load(`${face.weight} ${face.size}px ${face.family}`).catch(() => []),
    ),
  );
  await document.fonts.ready;
}

const registered = new Set<string>();

/** Idempotently register an uploaded brand font so the browser can draw it. */
export async function registerUploadedFont(assetId: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const family = uploadedFontFamily(assetId);
  if (registered.has(family)) return;
  registered.add(family);

  const face = new FontFace(family, `url(${brandAssetFontUrl(assetId)})`);
  try {
    document.fonts.add(await face.load());
  } catch {
    registered.delete(family);
  }
}
