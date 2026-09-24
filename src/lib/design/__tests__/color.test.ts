import { describe, expect, it } from "vitest";
import {
  composite,
  contrastRatio,
  hexToRgb,
  hslToRgb,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
} from "@/lib/design/color";

describe("hex conversion", () => {
  it("round-trips a colour", () => {
    expect(rgbToHex(hexToRgb("#ff1c7c") as never)).toBe("#ff1c7c");
  });

  it("refuses something that is not a colour", () => {
    expect(hexToRgb("#fff")).toBeNull();
    expect(hexToRgb("nonsense")).toBeNull();
  });

  it("clamps out-of-range channels rather than emitting invalid hex", () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });
});

describe("relativeLuminance", () => {
  it("anchors black and white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it("puts a mid green above a vivid pink, as the green channel's weight demands", () => {
    const pink = relativeLuminance(hexToRgb("#ff1c7c") as never);
    const green = relativeLuminance(hexToRgb("#58cc02") as never);

    expect(green).toBeGreaterThan(pink);
  });
});

describe("contrastRatio", () => {
  it("gives black on white the WCAG maximum", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 1);
  });

  it("does not care which way round the pair is given", () => {
    const a = { r: 10, g: 40, b: 90 };
    const b = { r: 240, g: 240, b: 230 };

    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe("composite", () => {
  it("returns the backdrop at zero alpha and the overlay at one", () => {
    const fg = { r: 0, g: 0, b: 0 };
    const bg = { r: 200, g: 100, b: 50 };

    expect(composite(fg, bg, 0)).toEqual(bg);
    expect(composite(fg, bg, 1)).toEqual(fg);
  });

  it("lands halfway at 0.5", () => {
    expect(composite({ r: 0, g: 0, b: 0 }, { r: 200, g: 100, b: 50 }, 0.5)).toEqual({
      r: 100,
      g: 50,
      b: 25,
    });
  });
});

describe("hsl conversion", () => {
  it("round-trips saturated colours", () => {
    for (const hex of ["#ff1c7c", "#58cc02", "#3366cc", "#101010"]) {
      const rgb = hexToRgb(hex) as never;
      expect(rgbToHex(hslToRgb(rgbToHsl(rgb)))).toBe(hex);
    }
  });

  it("reports grey as unsaturated", () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
});
