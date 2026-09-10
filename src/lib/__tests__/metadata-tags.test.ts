import { describe, expect, it } from "vitest";
import { combineCaptionAndTags } from "@/components/posts/CaptionTagsField";
import { POST_TAG_MAX_COUNT, POST_TAG_MAX_LENGTH } from "../constants";
import { normalizeTagList } from "../metadata/tags";

describe("normalizeTagList", () => {
  it("returns an empty list for non-array input", () => {
    expect(normalizeTagList(undefined)).toEqual([]);
    expect(normalizeTagList(null)).toEqual([]);
    expect(normalizeTagList("ai")).toEqual([]);
  });

  it("trims, strips a leading hash, and drops empties", () => {
    expect(normalizeTagList([" #ai ", "video", "  ", "#"])).toEqual(["ai", "video"]);
  });

  it("ignores non-string entries", () => {
    expect(normalizeTagList(["ai", 42, null, { tag: "x" }, "video"])).toEqual(["ai", "video"]);
  });

  it("removes duplicates, including ones created by stripping the hash", () => {
    expect(normalizeTagList(["ai", "#ai", " ai ", "video"])).toEqual(["ai", "video"]);
  });

  it("preserves multi-word tags", () => {
    expect(normalizeTagList(["ai automation", "video editing"])).toEqual([
      "ai automation",
      "video editing",
    ]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: POST_TAG_MAX_COUNT + 10 }, (_, i) => `tag${i}`);
    expect(normalizeTagList(many)).toHaveLength(POST_TAG_MAX_COUNT);
  });

  it("caps the length of a single tag", () => {
    const [tag] = normalizeTagList(["x".repeat(POST_TAG_MAX_LENGTH + 20)]);
    expect(tag).toHaveLength(POST_TAG_MAX_LENGTH);
  });
});

describe("combineCaptionAndTags", () => {
  it("joins prefixed hashtags with a space", () => {
    expect(combineCaptionAndTags("Hello", ["ai", "video"], "#")).toBe("Hello\n\n#ai #video");
  });

  it("joins bare tags with a comma so multi-word tags stay separable", () => {
    expect(combineCaptionAndTags("Hello", ["ai automation", "video editing"])).toBe(
      "Hello\n\nai automation, video editing",
    );
  });

  it("omits the blank line when there is no caption or no tags", () => {
    expect(combineCaptionAndTags("", ["ai"], "#")).toBe("#ai");
    expect(combineCaptionAndTags("Hello", [])).toBe("Hello");
    expect(combineCaptionAndTags("", [])).toBe("");
  });
});
