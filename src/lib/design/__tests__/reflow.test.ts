import { describe, expect, it } from "vitest";
import type { Box } from "@/lib/design/canvas-spec";
import type { DesignDocument, StackAnchor, TextLayer } from "@/lib/design/document";
import { type MeasureText, reflowAutoLayout } from "@/lib/design/reflow";

const AREA: Box = { x: 50, y: 50, width: 980, height: 1100 };

function text(id: string, over: Partial<TextLayer> = {}): TextLayer {
  return {
    id,
    type: "text",
    x: AREA.x,
    y: AREA.y,
    width: AREA.width,
    height: 100,
    rotation: 0,
    text: "copy",
    role: id === "heading" ? "heading" : "body",
    fontFamily: "Inter",
    fontSize: 124,
    fontWeight: 800,
    italic: false,
    underline: false,
    lineThrough: false,
    lineHeight: 1.12,
    align: "center",
    color: "#ffffff",
    ...over,
  };
}

function doc(layers: TextLayer[], anchor: StackAnchor = "middle", gap = 40): DesignDocument {
  return {
    background: { kind: "solid", color: "#000000" },
    autoLayout: { anchor, gap },
    layers,
  };
}

/** Heights as a fixed number of lines, so a smaller font genuinely measures shorter. */
function linesOf(counts: Record<string, number>): MeasureText {
  return (layer) => counts[layer.id] * layer.fontSize * layer.lineHeight;
}

describe("reflowAutoLayout", () => {
  it("leaves a document without autoLayout alone", () => {
    const document: DesignDocument = {
      background: { kind: "solid", color: "#000000" },
      layers: [text("heading")],
    };

    expect(reflowAutoLayout(document, AREA, linesOf({ heading: 3 }))).toBeNull();
  });

  it("leaves the layout alone once a non-text layer has been added", () => {
    const document = doc([text("heading")]);
    document.layers = [
      ...document.layers,
      { id: "logo", type: "logo", assetId: "a1", x: 0, y: 0, width: 80, height: 80, rotation: 0 },
    ];

    expect(reflowAutoLayout(document, AREA, linesOf({ heading: 3, logo: 1 }))).toBeNull();
  });

  it("reports no change when the stored stack already matches the measurements", () => {
    const measure = linesOf({ heading: 2, body: 3 });
    const document = doc([text("heading"), text("body", { fontSize: 45, lineHeight: 1.4 })]);

    const first = reflowAutoLayout(document, AREA, measure);
    expect(first).not.toBeNull();

    // Feeding the corrected document back in is the idempotence that stops a render loop.
    expect(reflowAutoLayout(first as DesignDocument, AREA, measure)).toBeNull();
  });

  it("pushes the body clear when the headline wraps onto more lines than estimated", () => {
    // The reported case: the estimator said two lines, the real font wraps onto three.
    const document = doc([
      text("heading", { y: 347, height: 278 }),
      text("body", { y: 665, height: 189, fontSize: 45, lineHeight: 1.4 }),
    ]);

    const next = reflowAutoLayout(document, AREA, linesOf({ heading: 3, body: 2 }));
    const [heading, body] = next?.layers as TextLayer[];

    expect(heading.height).toBe(Math.ceil(3 * 124 * 1.12));
    expect(body.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    expect(body.y - (heading.y + heading.height)).toBeLessThanOrEqual(40 + 1);
  });

  it.each([
    ["top", (area: Box) => area.y],
    ["bottom", (area: Box, total: number) => area.y + area.height - total],
  ] as const)("anchors the stack to the %s of the safe area", (anchor, expected) => {
    const measure = linesOf({ heading: 2 });
    const next = reflowAutoLayout(doc([text("heading")], anchor), AREA, measure);
    const [heading] = next?.layers as TextLayer[];

    expect(heading.y).toBe(Math.round(expected(AREA, 2 * 124 * 1.12)));
  });

  it("centres the stack for a middle anchor", () => {
    const next = reflowAutoLayout(doc([text("heading")], "middle"), AREA, linesOf({ heading: 2 }));
    const [heading] = next?.layers as TextLayer[];
    const total = 2 * 124 * 1.12;

    expect(heading.y).toBe(Math.round(AREA.y + (AREA.height - total) / 2));
  });

  it("shrinks the type until an oversized stack fits the safe area", () => {
    // Eight lines at 124px is well over the 1100px safe area and has to come down.
    const document = doc([text("heading")]);
    const next = reflowAutoLayout(document, AREA, linesOf({ heading: 8 }));
    const [heading] = next?.layers as TextLayer[];

    expect(heading.fontSize).toBeLessThan(124);
    expect(heading.height).toBeLessThanOrEqual(AREA.height);
    expect(heading.y).toBeGreaterThanOrEqual(AREA.y);
  });

  it("keeps every block inside the safe area when both are oversized", () => {
    const document = doc([text("heading"), text("body", { fontSize: 45, lineHeight: 1.4 })]);
    const next = reflowAutoLayout(document, AREA, linesOf({ heading: 6, body: 6 }));
    const layers = next?.layers as TextLayer[];

    const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
    expect(layers[0].y).toBeGreaterThanOrEqual(AREA.y);
    expect(bottom).toBeLessThanOrEqual(AREA.y + AREA.height + 1);
  });
});
