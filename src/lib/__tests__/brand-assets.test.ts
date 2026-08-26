import { describe, expect, it } from "vitest";
import {
  BRAND_ASSET_EXTENSIONS,
  brandAssetStoragePath,
  fileExtension,
  isBrandAssetType,
  resolveOwnBrandAssetPath,
  sanitizeAssetFileName,
} from "@/lib/brand-assets";

const USER = "clx1user0000000000000000";
const VICTIM = "clx2victim000000000000000";

describe("resolveOwnBrandAssetPath", () => {
  it("accepts a path produced by brandAssetStoragePath", () => {
    const path = brandAssetStoragePath(USER, "logo", "mark.png", 1700000000000);
    expect(resolveOwnBrandAssetPath(path, USER)).toBe(path);
  });

  it("accepts every asset type with its own extensions", () => {
    for (const [type, extensions] of Object.entries(BRAND_ASSET_EXTENSIONS)) {
      for (const ext of extensions) {
        const path = `brand-assets/${USER}/${type}/1700000000000-file${ext}`;
        expect(resolveOwnBrandAssetPath(path, USER)).toBe(path);
      }
    }
  });

  it("rejects a path owned by another user", () => {
    const path = brandAssetStoragePath(VICTIM, "logo", "mark.png", 1700000000000);
    expect(resolveOwnBrandAssetPath(path, USER)).toBeNull();
  });

  it("rejects traversal into another user's directory", () => {
    // The exploit from the review: the raw path contains the caller's id, so a
    // substring check would pass, but it resolves into the victim's directory.
    expect(
      resolveOwnBrandAssetPath(
        `brand-assets/${USER}/../${VICTIM}/logo/1700000000000-mark.png`,
        USER,
      ),
    ).toBeNull();
    expect(
      resolveOwnBrandAssetPath(
        `brand-assets/${USER}/logo/../../${VICTIM}/logo/1700000000000-mark.png`,
        USER,
      ),
    ).toBeNull();
  });

  it("rejects escaping the storage root entirely", () => {
    expect(resolveOwnBrandAssetPath("../../etc/passwd", USER)).toBeNull();
    expect(resolveOwnBrandAssetPath("/etc/passwd", USER)).toBeNull();
    expect(resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/..`, USER)).toBeNull();
  });

  it("rejects backslash and null-byte payloads", () => {
    expect(
      resolveOwnBrandAssetPath(`brand-assets\\${USER}\\logo\\1700000000000-a.png`, USER),
    ).toBeNull();
    expect(
      resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/1700000000000-a.png\0.txt`, USER),
    ).toBeNull();
  });

  it("rejects paths outside the brand-assets prefix", () => {
    expect(resolveOwnBrandAssetPath(`videos/${USER}.mp4`, USER)).toBeNull();
    expect(resolveOwnBrandAssetPath(`avatars/${USER}/logo/1700000000000-a.png`, USER)).toBeNull();
  });

  it("rejects an unknown asset type", () => {
    expect(
      resolveOwnBrandAssetPath(`brand-assets/${USER}/secrets/1700000000000-a.png`, USER),
    ).toBeNull();
  });

  it("rejects an extension the asset type does not allow", () => {
    expect(
      resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/1700000000000-a.ttf`, USER),
    ).toBeNull();
    expect(
      resolveOwnBrandAssetPath(`brand-assets/${USER}/font/1700000000000-a.png`, USER),
    ).toBeNull();
    expect(
      resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/1700000000000-a.svg`, USER),
    ).toBeNull();
  });

  it("rejects a filename without the timestamp prefix", () => {
    expect(resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/mark.png`, USER)).toBeNull();
  });

  it("rejects an empty path or empty user id", () => {
    expect(resolveOwnBrandAssetPath("", USER)).toBeNull();
    expect(resolveOwnBrandAssetPath(`brand-assets/${USER}/logo/1-a.png`, "")).toBeNull();
  });
});

describe("sanitizeAssetFileName", () => {
  it("strips path separators and leading dots", () => {
    expect(sanitizeAssetFileName("../../etc/passwd")).toBe("__.._etc_passwd");
    expect(sanitizeAssetFileName(".hidden")).toBe("_hidden");
    expect(sanitizeAssetFileName("my logo (final).png")).toBe("my_logo__final_.png");
  });

  it("produces a name the path validator accepts", () => {
    const path = brandAssetStoragePath(USER, "logo", "../../etc/evil.png", 1700000000000);
    expect(resolveOwnBrandAssetPath(path, USER)).toBe(path);
  });
});

describe("fileExtension", () => {
  it("lowercases and returns the last extension", () => {
    expect(fileExtension("Logo.PNG")).toBe(".png");
    expect(fileExtension("archive.tar.gz")).toBe(".gz");
    expect(fileExtension("noext")).toBe("");
  });
});

describe("isBrandAssetType", () => {
  it("only accepts the known types", () => {
    expect(isBrandAssetType("logo")).toBe(true);
    expect(isBrandAssetType("pattern")).toBe(true);
    expect(isBrandAssetType("font")).toBe(true);
    expect(isBrandAssetType("avatar")).toBe(false);
    expect(isBrandAssetType(null)).toBe(false);
  });
});
