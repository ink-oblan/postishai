import { describe, expect, it } from "vitest";
import {
  type CarouselSlideSource,
  describeCarouselSlide,
  slideBackground,
  slideCopy,
} from "@/lib/metadata/carousel";

function textLayer(id: string, y: number, text: string, role: "heading" | "body") {
  return {
    id,
    type: "text",
    x: 0,
    y,
    width: 100,
    height: 40,
    rotation: 0,
    text,
    role,
    fontFamily: "Inter",
    fontSize: 48,
    color: "#ffffff",
  };
}

function slide(overrides: Partial<CarouselSlideSource> = {}): CarouselSlideSource {
  return {
    headline: "Generated hook",
    body: "Generated body",
    visualPrompt: "A calm beach at dawn",
    imagePath: "posts/p/slides/s/2.jpg",
    status: "COMPLETED",
    design: null,
    images: [
      { imagePath: "posts/p/slides/s/1.jpg", createdAt: new Date(1) },
      { imagePath: "posts/p/slides/s/2.jpg", createdAt: new Date(2) },
    ],
    ...overrides,
  };
}

describe("slideCopy", () => {
  it("falls back to the generated copy before the slide has a design", () => {
    expect(slideCopy(slide({ body: "  " }))).toEqual([{ role: "heading", text: "Generated hook" }]);
  });

  it("reads the edited text layers top to bottom", () => {
    const design = {
      background: { kind: "solid", color: "#000000" },
      layers: [
        textLayer("b", 500, "Edited body", "body"),
        { id: "s", type: "shape", x: 0, y: 0, width: 10, height: 10, fill: "#fff" },
        textLayer("h", 100, "Edited hook", "heading"),
        textLayer("e", 800, "   ", "body"),
      ],
    };

    expect(slideCopy(slide({ design }))).toEqual([
      { role: "heading", text: "Edited hook" },
      { role: "body", text: "Edited body" },
    ]);
  });

  it("keeps a slide whose text was all removed free of the generated copy", () => {
    const design = { background: { kind: "solid", color: "#000000" }, layers: [] };

    expect(slideCopy(slide({ design }))).toEqual([]);
  });
});

describe("slideBackground", () => {
  it("vouches for the visual prompt when the newest background is shown", () => {
    expect(slideBackground(slide())).toEqual({ kind: "known", subject: "A calm beach at dawn" });
  });

  it("reports no background when the slide has no image", () => {
    expect(slideBackground(slide({ imagePath: null }))).toEqual({ kind: "none" });
  });

  it("cannot vouch for an earlier background switched back to", () => {
    expect(slideBackground(slide({ imagePath: "posts/p/slides/s/1.jpg" }))).toEqual({
      kind: "unknown",
    });
  });

  it("cannot vouch while a regenerate is still in flight", () => {
    expect(slideBackground(slide({ status: "GENERATING" }))).toEqual({ kind: "unknown" });
  });
});

describe("describeCarouselSlide", () => {
  it("renders the slide's copy and background", async () => {
    const text = await describeCarouselSlide({
      number: 2,
      total: 5,
      copy: [{ role: "heading", text: "Save 3 hours a week" }],
      background: { kind: "known", subject: "A tidy desk" },
    });

    expect(text).toContain("slide 2 of 5");
    expect(text).toContain('heading text on the slide: "Save 3 hours a week"');
    expect(text).toContain("Background image: A tidy desk");
  });

  it("says so when a slide is text-free on a plain background", async () => {
    const text = await describeCarouselSlide({
      number: 1,
      total: 1,
      copy: [],
      background: { kind: "none" },
    });

    expect(text).toContain("No text on the slide.");
    expect(text).toContain("Background: plain colour, no image.");
  });
});
