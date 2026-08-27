/**
 * Shared brand-asset rules. Deliberately dependency-free so both the client uploader and
 * the API routes enforce the same limits from one place.
 */

export const BRAND_ASSET_TYPES = ["logo", "pattern", "font"] as const;

export type BrandAssetType = (typeof BRAND_ASSET_TYPES)[number];

/** Extensions each asset type accepts, mirrored by the client-side FileUploader. */
export const BRAND_ASSET_EXTENSIONS: Record<BrandAssetType, readonly string[]> = {
  logo: [".png"],
  pattern: [".png"],
  font: [".ttf", ".otf", ".woff", ".woff2"],
};

/** Fonts are legitimately large (a full TTF can be >20MB), images are not. */
export const MAX_BRAND_ASSET_SIZE_BYTES: Record<BrandAssetType, number> = {
  logo: 10 * 1024 * 1024,
  pattern: 10 * 1024 * 1024,
  font: 25 * 1024 * 1024,
};

export const MAX_BRAND_ASSET_FILES_PER_REQUEST = 10;

/** Upper bound on the whole multipart body, checked before it is buffered. */
export const MAX_BRAND_UPLOAD_BODY_BYTES = 30 * 1024 * 1024;

export const BRAND_ASSET_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function isBrandAssetType(value: unknown): value is BrandAssetType {
  return typeof value === "string" && (BRAND_ASSET_TYPES as readonly string[]).includes(value);
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/** Strip anything that could produce a path segment or escape the asset directory. */
export function sanitizeAssetFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/^\.+/, "_");
}

export function brandAssetStoragePath(
  userId: string,
  fileType: BrandAssetType,
  fileName: string,
  timestamp: number = Date.now(),
): string {
  return `brand-assets/${userId}/${fileType}/${timestamp}-${sanitizeAssetFileName(fileName)}`;
}

/**
 * List fields arrive either already parsed — from a Json column, or from a client that sent
 * real JSON — or as the JSON string older clients and rows still carry.
 */
function parseEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The asset ids referenced by one of the wizard's list fields.
 * Entries without an `assetId`, say — are skipped, and
 * anything malformed yields an empty list rather than throwing.
 */
export function extractAssetIds(value: unknown): string[] {
  return parseEntries(value).flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const assetId = (entry as { assetId?: unknown }).assetId;
    return typeof assetId === "string" && assetId.length > 0 ? [assetId] : [];
  });
}
