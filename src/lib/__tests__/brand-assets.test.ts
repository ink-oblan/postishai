import { describe, expect, it } from "vitest";
import {
  brandAssetStoragePath,
  extractAssetIds,
  fileExtension,
  isBrandAssetType,
  sanitizeAssetFileName,
} from "@/lib/brand-assets";

const USER = "clx1user0000000000000000";

describe("extractAssetIds", () => {
  const entries = [
    { id: "a", name: "logo.png", assetId: "clxasset1" },
    { id: "b", name: "mark.png", assetId: "clxasset2" },
  ];

  it("reads an array, as a Json column returns it", () => {
    expect(extractAssetIds(entries)).toEqual(["clxasset1", "clxasset2"]);
  });

  it("reads a JSON string, as older clients and rows still hold it", () => {
    expect(extractAssetIds(JSON.stringify(entries))).toEqual(["clxasset1", "clxasset2"]);
  });

  it("skips entries with no assetId, such as library fonts", () => {
    const fonts = [
      { id: "a", name: "Inter", source: "builtin" },
      { id: "b", name: "Custom.ttf", source: "uploaded", assetId: "clxfont1" },
    ];
    expect(extractAssetIds(JSON.stringify(fonts))).toEqual(["clxfont1"]);
  });

  it("returns nothing for empty, malformed or non-list values", () => {
    expect(extractAssetIds(undefined)).toEqual([]);
    expect(extractAssetIds(null)).toEqual([]);
    expect(extractAssetIds("")).toEqual([]);
    expect(extractAssetIds("not json")).toEqual([]);
    expect(extractAssetIds('{"assetId":"x"}')).toEqual([]);
    expect(extractAssetIds(JSON.stringify([null, 42, "text"]))).toEqual([]);
  });

  it("ignores a non-string assetId", () => {
    expect(extractAssetIds(JSON.stringify([{ assetId: 42 }, { assetId: "" }]))).toEqual([]);
  });
});

describe("sanitizeAssetFileName", () => {
  it("strips path separators and leading dots", () => {
    expect(sanitizeAssetFileName("../../etc/passwd")).toBe("__.._etc_passwd");
    expect(sanitizeAssetFileName(".hidden")).toBe("_hidden");
    expect(sanitizeAssetFileName("my logo (final).png")).toBe("my_logo__final_.png");
  });

  it("keeps a hostile name inside the caller's own directory", () => {
    expect(brandAssetStoragePath(USER, "logo", "../../etc/evil.png", 1700000000000)).toBe(
      `brand-assets/${USER}/logo/1700000000000-__.._etc_evil.png`,
    );
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
