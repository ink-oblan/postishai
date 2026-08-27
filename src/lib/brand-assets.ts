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
 * The wizard hands its list fields back as JSON strings, and `parseBrandProfileInput` stores
 * that string as-is into a Json column — so a value read back from Prisma is a JSON string
 * *inside* JSONB, and needs unwrapping twice before it is an array.
 */
function parseEntries(value: unknown): unknown[] {
  let current = value;

  for (let depth = 0; depth < 2; depth++) {
    if (Array.isArray(current)) return current;
    if (typeof current !== "string") return [];
    try {
      current = JSON.parse(current);
    } catch {
      return [];
    }
  }

  return Array.isArray(current) ? current : [];
}

/**
 * The asset ids referenced by one of the wizard's list fields (`logoPath`, `patterns`,
 * `typography`). Entries without an `assetId` — library fonts, say — are skipped, and
 * anything malformed yields an empty list rather than throwing.
 */
export function extractAssetIds(value: unknown): string[] {
  return parseEntries(value).flatMap((entry) => {
    if (entry === null || typeof entry !== "object") return [];
    const assetId = (entry as { assetId?: unknown }).assetId;
    return typeof assetId === "string" && assetId.length > 0 ? [assetId] : [];
  });
}
