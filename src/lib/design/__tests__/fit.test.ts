import { describe, expect, it } from "vitest";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument, TextLayer } from "@/lib/design/document";
import { fitReport } from "@/lib/design/fit";
import { layoutAutoLayout, layoutNominalFontSizes } from "@/lib/design/layouts";

const PORTRAIT: CanvasSpec = {
  width: 1080,
  height: 1350,
  safeZone: { top: 50, right: 50, bottom: 200, left: 50 },
};

const AREA_HEIGHT = PORTRAIT.height - 50 - 200;

const NOMINAL = layoutNominalFontSizes("statement", PORTRAIT);

function text(role: TextLayer["role"], fontSize: number): TextLayer {
  return {
    id: role,
    type: "text",
    x: 50,
    y: 50,
    width: 980,
    height: 100,
    rotation: 0,
    text: "copy",
    role,
    fontFamily: "Inter",
    fontSize,
    fontWeight: 700,
    italic: false,
    underline: false,
    lineThrough: false,
    lineHeight: 1.2,
    align: "left",
    color: "#ffffff",
  };
}

function document(layers: TextLayer[]): DesignDocument {
  return {
    background: { kind: "solid", color: "#111111" },
    autoLayout: layoutAutoLayout("statement"),
    layers,
  };
}

const measuring = (height: number) => () => height;

describe("fitReport", () => {
  it("reports a clean fit at the layout's own sizes", () => {
    const report = fitReport({
      document: document([text("heading", NOMINAL.heading), text("body", NOMINAL.body)]),
      layout: "statement",
      spec: PORTRAIT,
      measure: measuring(200),
    });

    expect(report).toEqual({ shrunk: false, overflowing: false });
  });

  it("counts the stack gap towards the overflow", () => {
    const { gap } = layoutAutoLayout("statement");
    const half = (AREA_HEIGHT - gap) / 2;

    expect(
      fitReport({
        document: document([text("heading", NOMINAL.heading), text("body", NOMINAL.body)]),
        layout: "statement",
        spec: PORTRAIT,
        measure: measuring(half),
      }).overflowing,
    ).toBe(false);

    expect(
      fitReport({
        document: document([text("heading", NOMINAL.heading), text("body", NOMINAL.body)]),
        layout: "statement",
        spec: PORTRAIT,
        measure: measuring(half + 1),
      }).overflowing,
    ).toBe(true);
  });

  it("ignores a shrink the layout can absorb but flags one it cannot", () => {
    const report = (fontSize: number) =>
      fitReport({
        document: document([text("heading", fontSize)]),
        layout: "statement",
        spec: PORTRAIT,
        measure: measuring(100),
      }).shrunk;

    expect(report(Math.ceil(NOMINAL.heading * 0.8))).toBe(false);
    expect(report(Math.floor(NOMINAL.heading * 0.79))).toBe(true);
  });

  it("measures each role against its own nominal size", () => {
    const report = fitReport({
      document: document([text("heading", NOMINAL.heading), text("body", NOMINAL.heading)]),
      layout: "statement",
      spec: PORTRAIT,
      measure: measuring(100),
    });

    expect(report.shrunk).toBe(false);
  });

  it("says nothing about a document with no copy", () => {
    expect(
      fitReport({
        document: document([]),
        layout: "statement",
        spec: PORTRAIT,
        measure: measuring(10_000),
      }),
    ).toEqual({ shrunk: false, overflowing: false });
  });
});
