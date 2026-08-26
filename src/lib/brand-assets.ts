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
 * Exactly the shape `brandAssetStoragePath` produces: four segments, anchored, with a
 * strict charset per segment.
 *
 * Being segment-exact is what makes this traversal-proof. A payload such as
 * `brand-assets/<me>/../<victim>/logo/1-x.png` has six segments and cannot match, so it
 * is rejected *before* any normalization can collapse `..` and hide the real owner.
 */
const BRAND_ASSET_PATH_PATTERN =
  /^brand-assets\/([A-Za-z0-9_-]+)\/(logo|pattern|font)\/\d+-[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

/**
 * Validate a client-supplied storage path and return it only if it belongs to `userId`;
 * `null` when it is malformed or owned by somebody else.
 */
export function resolveOwnBrandAssetPath(rawPath: string, userId: string): string | null {
  if (!userId || !rawPath || rawPath.includes("\0") || rawPath.includes("\\")) return null;

  const match = BRAND_ASSET_PATH_PATTERN.exec(rawPath);
  if (!match) return null;

  const [, ownerId, assetType] = match;
  if (ownerId !== userId) return null;

  const ext = fileExtension(rawPath);
  if (!BRAND_ASSET_EXTENSIONS[assetType as BrandAssetType].includes(ext)) return null;

  return rawPath;
}
