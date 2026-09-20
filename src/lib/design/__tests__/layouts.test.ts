import { describe, expect, it } from "vitest";
import { type CanvasSpec, safeArea } from "@/lib/design/canvas-spec";
import type { TextLayer } from "@/lib/design/document";
import {
  estimateLineCount,
  expandLayout,
  fitFontSize,
  LAYOUT_NAMES,
  type LayoutInput,
  layoutAutoLayout,
  layoutNominalFontSizes,
  layoutSketch,
} from "@/lib/design/layouts";

const PORTRAIT: CanvasSpec = {
  width: 1080,
  height: 1350,
  safeZone: { top: 50, right: 50, bottom: 200, left: 50 },
};

const VERTICAL: CanvasSpec = {
  width: 1080,
  height: 1920,
  safeZone: { top: 150, right: 50, bottom: 380, left: 50 },
};

function input(spec: CanvasSpec, overrides: Partial<LayoutInput> = {}): LayoutInput {
  return {
    spec,
    headline: "Five habits that actually stuck",
    body: "The ones I still do a year later, and the one I quietly dropped.",
    fonts: { heading: "Inter", body: "Inter" },
    colors: { heading: "#ffffff", body: "#e5e5e5", plate: "#000000" },
    ...overrides,
  };
}

describe("estimateLineCount", () => {
  it("wraps on whole words", () => {
    expect(estimateLineCount("aaa bbb ccc", 7)).toBe(2);
  });

  it("counts each newline-separated paragraph separately", () => {
    expect(estimateLineCount("one\ntwo\nthree", 40)).toBe(3);
  });

  it("gives an empty paragraph a line of its own", () => {
    expect(estimateLineCount("a\n\nb", 40)).toBe(3);
  });

  it("does not divide by a zero-width line", () => {
    expect(estimateLineCount("abc", 0)).toBe(3);
  });
});

describe("fitFontSize", () => {
  it("keeps the maximum size when the text easily fits", () => {
    const fitted = fitFontSize(
      "Short",
      { x: 0, y: 0, width: 980, height: 600 },
      {
        max: 120,
        min: 40,
        lineHeight: 1.2,
      },
    );
    expect(fitted.fontSize).toBe(120);
  });

  it("steps down until a long headline fits its box", () => {
    const box = { x: 0, y: 0, width: 980, height: 300 };
    const long = "A considerably longer headline than the box can take at full size, by far";
    const fitted = fitFontSize(long, box, { max: 120, min: 40, lineHeight: 1.2 });

    expect(fitted.fontSize).toBeLessThan(120);
    expect(fitted.lines * fitted.fontSize * 1.2).toBeLessThanOrEqual(box.height);
  });

  it("never returns below the floor", () => {
    const fitted = fitFontSize(
      "word ".repeat(400),
      { x: 0, y: 0, width: 200, height: 100 },
      {
        max: 120,
        min: 40,
        lineHeight: 1.2,
      },
    );
    expect(fitted.fontSize).toBe(40);
  });
});

describe("expandLayout", () => {
  for (const spec of [PORTRAIT, VERTICAL]) {
    const label = `${spec.width}x${spec.height}`;

    for (const name of LAYOUT_NAMES) {
      it(`keeps ${name} inside the safe area at ${label}`, () => {
        const area = safeArea(spec);
        const layers = expandLayout(name, input(spec));

        expect(layers.length).toBeGreaterThan(0);
        for (const layer of layers) {
          expect(layer.x).toBeGreaterThanOrEqual(area.x);
          expect(layer.y).toBeGreaterThanOrEqual(area.y);
          expect(layer.x + layer.width).toBeLessThanOrEqual(area.x + area.width);
          expect(layer.y + layer.height).toBeLessThanOrEqual(area.y + area.height);
        }
      });
    }
  }

  it("keeps long copy inside the safe area by shrinking it", () => {
    const area = safeArea(PORTRAIT);
    const layers = expandLayout(
      "statement",
      input(PORTRAIT, {
        headline: "An unusually long headline that would normally run well past the frame edge",
        body: "And a body paragraph to match, long enough that the two together overflow the safe area they were given, which is the case the estimator alone does not catch.",
      }),
    );

    const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
    expect(bottom).toBeLessThanOrEqual(area.y + area.height);
  });

  it("emits only the blocks it was given copy for", () => {
    const layers = expandLayout("cover", input(PORTRAIT, { body: null }));
    expect(layers.map((layer) => layer.id)).toEqual(["heading"]);
  });

  it("returns nothing when there is no copy at all", () => {
    expect(expandLayout("cover", input(PORTRAIT, { headline: "", body: "" }))).toEqual([]);
  });

  it("applies the requested fonts and colours", () => {
    const layers = expandLayout(
      "statement",
      input(PORTRAIT, {
        fonts: { heading: "Playfair Display", body: "Lora" },
        colors: { heading: "#ff0000", body: "#00ff00", plate: "#000000" },
      }),
    );
    const [heading, body] = layers as TextLayer[];

    expect(heading.fontFamily).toBe("Playfair Display");
    expect(heading.color).toBe("#ff0000");
    expect(body.fontFamily).toBe("Lora");
    expect(body.color).toBe("#00ff00");
  });

  it("plates every text block in the layout's colour", () => {
    const layers = expandLayout("statement", input(PORTRAIT)) as TextLayer[];

    expect(layers).not.toHaveLength(0);
    for (const layer of layers) {
      expect(layer.background?.color).toBe("#000000");
      expect(layer.background?.opacity).toBeGreaterThan(0);
    }
  });

  /**
   * The pair has to read as one band. If the padding stopped being half the gap, a stripe of
   * photograph would reopen between the headline's plate and the body's.
   */
  it("pads plates so the heading's meets the body's", () => {
    const [heading, body] = expandLayout("statement", input(PORTRAIT)) as TextLayer[];
    const padding = heading.background?.padding ?? 0;

    expect(padding).toBeGreaterThan(0);
    expect(body.background?.padding).toBe(padding);
    expect(heading.y + heading.height + padding).toBe(body.y - padding);
  });
});

describe("layoutNominalFontSizes", () => {
  it("is the size a short line actually comes out at", () => {
    for (const name of LAYOUT_NAMES) {
      const nominal = layoutNominalFontSizes(name, PORTRAIT);
      const [heading] = expandLayout(name, input(PORTRAIT, { headline: "Go", body: "" })) as [
        TextLayer,
      ];

      expect(heading.fontSize).toBe(nominal.heading);
    }
  });

  it("never sits under what a fitted block was allowed to keep", () => {
    for (const name of LAYOUT_NAMES) {
      const nominal = layoutNominalFontSizes(name, PORTRAIT);
      const layers = expandLayout(
        name,
        input(PORTRAIT, {
          headline: "A headline long enough that the estimator has to step the size down",
        }),
      ) as TextLayer[];

      for (const layer of layers) {
        expect(layer.fontSize).toBeLessThanOrEqual(nominal[layer.role]);
      }
    }
  });

  it("scales with the canvas width, not its height", () => {
    const wide: CanvasSpec = { ...PORTRAIT, width: PORTRAIT.width * 2 };

    expect(layoutNominalFontSizes("cover", wide).heading).toBe(
      layoutNominalFontSizes("cover", PORTRAIT).heading * 2,
    );
    expect(layoutNominalFontSizes("cover", VERTICAL).heading).toBe(
      layoutNominalFontSizes("cover", PORTRAIT).heading,
    );
  });
});

describe("layoutSketch", () => {
  it("reports the anchor the blocks are actually stacked against", () => {
    for (const name of LAYOUT_NAMES) {
      expect(layoutSketch(name).anchor).toBe(layoutAutoLayout(name).anchor);
    }
  });

  it("reports the alignment the copy is actually set in", () => {
    for (const name of LAYOUT_NAMES) {
      const [heading] = expandLayout(name, input(PORTRAIT)) as TextLayer[];
      expect(heading.align).toBe(layoutSketch(name).align);
    }
  });

  it("orders the roles the way the type scale does", () => {
    for (const name of LAYOUT_NAMES) {
      const { headingScale, bodyScale } = layoutSketch(name);
      expect(headingScale).toBeGreaterThan(bodyScale);
    }
  });
});
