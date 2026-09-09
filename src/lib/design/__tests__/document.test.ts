import { describe, expect, it } from "vitest";
import { parseDesignDocument } from "@/lib/design/document";

const heading = {
  id: "heading",
  type: "text",
  x: 50,
  y: 100,
  width: 980,
  height: 200,
  rotation: 0,
  text: "Hello",
  role: "heading",
  fontFamily: "Inter",
  fontSize: 96,
  fontWeight: 700,
  lineHeight: 1.12,
  align: "left",
  color: "#ffffff",
};

const background = { kind: "image", imagePath: "posts/a/slides/b/1.jpg" };

describe("parseDesignDocument", () => {
  it("reads a well-formed document", () => {
    const parsed = parseDesignDocument({ background, layers: [heading] });

    expect(parsed?.dropped).toBe(0);
    expect(parsed?.document.layers).toHaveLength(1);
    expect(parsed?.document.background).toEqual(background);
  });

  it("refuses a document with no readable background", () => {
    expect(parseDesignDocument({ background: { kind: "image" }, layers: [] })).toBeUndefined();
    expect(parseDesignDocument({ layers: [] })).toBeUndefined();
    expect(parseDesignDocument(null)).toBeUndefined();
  });

  it("drops unreadable layers but keeps the good ones", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [heading, { id: "broken", type: "text" }, { ...heading, id: "second" }],
    });

    expect(parsed?.dropped).toBe(1);
    expect(parsed?.document.layers.map((layer) => layer.id)).toEqual(["heading", "second"]);
  });

  it("drops a layer with a non-positive box", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [{ ...heading, width: 0 }],
    });

    expect(parsed?.dropped).toBe(1);
    expect(parsed?.document.layers).toEqual([]);
  });

  it("falls back on unknown align and role rather than dropping the layer", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [{ ...heading, align: "justify", role: "caption" }],
    });

    const [layer] = parsed?.document.layers ?? [];
    expect(layer).toMatchObject({ align: "left", role: "body" });
  });

  it("clamps out-of-range numbers into what the editor can render", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [{ ...heading, fontSize: 9000, fontWeight: 5, lineHeight: 99 }],
    });

    expect(parsed?.document.layers[0]).toMatchObject({
      fontSize: 400,
      fontWeight: 100,
      lineHeight: 4,
    });
  });

  it("keeps a shape and a logo layer", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [
        { id: "s", type: "shape", x: 0, y: 0, width: 10, height: 10, fill: "#000", opacity: 0.5 },
        { id: "l", type: "logo", x: 0, y: 0, width: 10, height: 10, assetId: "asset_1" },
      ],
    });

    expect(parsed?.dropped).toBe(0);
    expect(parsed?.document.layers.map((layer) => layer.type)).toEqual(["shape", "logo"]);
  });

  it("drops a layer of an unknown type", () => {
    const parsed = parseDesignDocument({
      background,
      layers: [{ id: "v", type: "video", x: 0, y: 0, width: 10, height: 10 }],
    });

    expect(parsed?.dropped).toBe(1);
  });

  it("reads a solid background and an overlay", () => {
    const parsed = parseDesignDocument({
      background: { kind: "solid", color: "#101010" },
      overlay: { color: "#000000", opacity: 0.4 },
      layers: [],
    });

    expect(parsed?.document.background).toEqual({ kind: "solid", color: "#101010" });
    expect(parsed?.document.overlay).toEqual({ color: "#000000", opacity: 0.4 });
  });

  it("ignores a partial crop rather than cropping to nonsense", () => {
    const parsed = parseDesignDocument({
      background: { ...background, crop: { x: 0, y: 0, w: 100 } },
      layers: [],
    });

    expect(parsed?.document.background).toEqual(background);
  });
});
