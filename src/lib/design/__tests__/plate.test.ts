import { describe, expect, it } from "vitest";
import { composite, contrastRatio, hexToRgb, type Rgb, rgbToHsl } from "@/lib/design/color";
import type { DesignDocument, TextLayer } from "@/lib/design/document";
import {
  DEFAULT_PLATE_COLOR,
  DEFAULT_PLATE_PADDING,
  defaultTextPlate,
  inferPlateColor,
  platePaddingForGap,
  withTextPlates,
} from "@/lib/design/plate";

function text(id: string, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id,
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
    italic: false,
    underline: false,
    lineThrough: false,
    lineHeight: 1.12,
    align: "left",
    color: "#ffffff",
    ...overrides,
  };
}

function doc(layers: DesignDocument["layers"], autoLayout?: DesignDocument["autoLayout"]) {
  return {
    background: { kind: "solid" as const, color: "#111111" },
    ...(autoLayout ? { autoLayout } : {}),
    layers,
  };
}

describe("withTextPlates", () => {
  it("plates every text layer", () => {
    const next = withTextPlates(doc([text("a"), text("b")]), defaultTextPlate("#ff0000"));

    for (const layer of next.layers) {
      expect(layer.type === "text" && layer.background?.color).toBe("#ff0000");
    }
  });

  it("clears the plate off every text layer", () => {
    const plated = doc([text("a", { background: defaultTextPlate() })]);
    const next = withTextPlates(plated, null);

    expect(next.layers[0].type === "text" && next.layers[0].background).toBeUndefined();
  });

  it("leaves shapes and logos alone", () => {
    const shape = {
      id: "s",
      type: "shape" as const,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      fill: "#000000",
      cornerRadius: 0,
      opacity: 1,
    };
    const next = withTextPlates(doc([shape, text("a")]), defaultTextPlate());

    expect(next.layers[0]).toEqual(shape);
  });

  /**
   * The generated padding is what closes the seam between the headline's plate and the body's.
   * Pushing a colour across the carousel must not quietly reset it to the standalone default.
   */
  it("keeps the padding a layout already set", () => {
    const plated = doc([text("a", { background: { ...defaultTextPlate(), padding: 22 } })]);
    const next = withTextPlates(plated, defaultTextPlate("#00ff00"));
    const [layer] = next.layers;

    expect(layer.type === "text" && layer.background).toEqual({
      ...defaultTextPlate("#00ff00"),
      padding: 22,
    });
  });

  it("derives padding from the stack gap when a layer has no plate yet", () => {
    const next = withTextPlates(
      doc([text("a")], { anchor: "bottom", gap: 32 }),
      defaultTextPlate(),
    );

    expect(next.layers[0].type === "text" && next.layers[0].background?.padding).toBe(
      platePaddingForGap(32),
    );
  });

  it("falls back to the standalone padding with no stack gap to read", () => {
    const next = withTextPlates(doc([text("a")]), defaultTextPlate());

    expect(next.layers[0].type === "text" && next.layers[0].background?.padding).toBe(
      DEFAULT_PLATE_PADDING,
    );
  });

  // Dropping it would leave generated slides restacking from scratch on every visit.
  it("keeps autoLayout", () => {
    const next = withTextPlates(doc([text("a")], { anchor: "top", gap: 36 }), defaultTextPlate());

    expect(next.autoLayout).toEqual({ anchor: "top", gap: 36 });
  });
});

describe("inferPlateColor", () => {
  const white = "#ffffff";

  function contrastAgainst(plate: string, sample: Rgb, textColor: string, opacity = 0.7) {
    const over = composite(hexToRgb(plate) as never, sample, opacity);
    return contrastRatio(over, hexToRgb(textColor) as never);
  }

  it("carries white text over the pale pastel photo the generator produces", () => {
    const sample = { r: 238, g: 234, b: 228 };
    const plate = inferPlateColor({ sample, textColors: [white] });

    expect(contrastAgainst(plate, sample, white)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * A generated slide sets its heading in white and its body a shade under. Tuning to the heading
   * alone put that body at roughly 4.1:1 over a pale photo — passing the bar for copy nobody was
   * worried about while missing it for the copy underneath.
   */
  it("satisfies the dimmest copy on the slide, not just the first layer", () => {
    const sample = { r: 238, g: 234, b: 228 };
    const plate = inferPlateColor({ sample, textColors: [white, "#ededed"] });

    expect(contrastAgainst(plate, sample, "#ededed")).toBeGreaterThanOrEqual(4.5);
    expect(contrastAgainst(plate, sample, white)).toBeGreaterThanOrEqual(4.5);
  });

  it("ignores a colour it cannot read but still honours the rest", () => {
    const sample = { r: 238, g: 234, b: 228 };
    const plate = inferPlateColor({ sample, textColors: ["bogus", "#ededed"] });

    expect(contrastAgainst(plate, sample, "#ededed")).toBeGreaterThanOrEqual(4.5);
  });

  /** The point of sampling at all: a black band would ignore the picture it sits in. */
  it("keeps the photo's hue rather than going neutral", () => {
    const sample = hexToRgb("#3a7bd5") as never;
    const plate = rgbToHsl(hexToRgb(inferPlateColor({ sample, textColors: [white] })) as never);

    expect(plate.h).toBeCloseTo(rgbToHsl(sample).h, 0);
    expect(plate.s).toBeGreaterThan(0);
  });

  it("caps saturation so the band does not read as a highlighter", () => {
    const sample = hexToRgb("#ff0000") as never;
    const plate = rgbToHsl(hexToRgb(inferPlateColor({ sample, textColors: [white] })) as never);

    expect(plate.s).toBeLessThanOrEqual(0.5);
  });

  /**
   * Darkening only as far as the copy needs is what keeps the photograph legible underneath, so
   * the measure is how far the plate is pushed from the photo — not where it ends up. A photo
   * already dark enough to carry white text is left where it is.
   */
  it("moves a dark photo's plate less than a bright photo's", () => {
    const shift = (sample: Rgb) => {
      const plate = inferPlateColor({ sample, textColors: [white] });
      return rgbToHsl(sample).l - rgbToHsl(hexToRgb(plate) as never).l;
    };

    expect(shift({ r: 40, g: 40, b: 40 })).toBe(0);
    expect(shift({ r: 240, g: 240, b: 240 })).toBeGreaterThan(0.5);
  });

  it("goes light instead when the copy is dark", () => {
    const sample = { r: 30, g: 30, b: 40 };
    const plate = inferPlateColor({ sample, textColors: ["#111111"] });

    expect(rgbToHsl(hexToRgb(plate) as never).l).toBeGreaterThan(0.5);
    expect(contrastAgainst(plate, sample, "#111111")).toBeGreaterThanOrEqual(4.5);
  });

  it("accounts for the opacity it will actually be drawn at", () => {
    const sample = { r: 238, g: 234, b: 228 };

    for (const opacity of [0.55, 0.7, 0.9]) {
      const plate = inferPlateColor({ sample, textColors: [white], opacity });
      expect(contrastAgainst(plate, sample, white, opacity)).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * Over a near-white photo at 40% even pure black composites to roughly 3.3:1, so there is no
   * colour that would pass. Going as dark as the colour space allows is the honest answer; the
   * opacity control in the inspector is the way out.
   */
  it("goes to the extreme when no colour can reach the target at that opacity", () => {
    const sample = { r: 238, g: 234, b: 228 };
    const plate = inferPlateColor({ sample, textColors: [white], opacity: 0.4 });

    expect(rgbToHsl(hexToRgb(plate) as never).l).toBe(0);
  });

  it("falls back to the neutral plate with no readable colour at all", () => {
    expect(inferPlateColor({ sample: { r: 1, g: 1, b: 1 }, textColors: ["bogus"] })).toBe(
      DEFAULT_PLATE_COLOR,
    );
    expect(inferPlateColor({ sample: { r: 1, g: 1, b: 1 }, textColors: [] })).toBe(
      DEFAULT_PLATE_COLOR,
    );
  });
});
