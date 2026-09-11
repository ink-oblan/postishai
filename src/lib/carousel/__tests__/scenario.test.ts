import { describe, expect, it } from "vitest";
import {
  mockScenario,
  parseScenarioResponse,
  ScenarioResponseError,
} from "@/lib/carousel/scenario";

function response(slides: unknown): string {
  return JSON.stringify({ slides });
}

const slide = {
  headline: "Five habits that stuck",
  body: "And the one I dropped.",
  visualPrompt: "Morning kitchen, soft light, empty counter space",
  layout: "cover",
};

describe("parseScenarioResponse", () => {
  it("reads a well-formed response", () => {
    const slides = parseScenarioResponse(response([slide, { ...slide, layout: "cta" }]), 2);

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({ headline: "Five habits that stuck", layout: "cover" });
    expect(slides[1].layout).toBe("cta");
  });

  it("strips code fences the model adds anyway", () => {
    const raw = `\`\`\`json\n${response([slide])}\n\`\`\``;
    expect(parseScenarioResponse(raw, 1)).toHaveLength(1);
  });

  it("falls back to the default layout when the name is unknown", () => {
    const slides = parseScenarioResponse(response([{ ...slide, layout: "collage" }]), 1);
    expect(slides[0].layout).toBe("statement");
  });

  it("allows an empty body", () => {
    const slides = parseScenarioResponse(response([{ ...slide, body: "" }]), 1);
    expect(slides[0].body).toBe("");
  });

  it("drops extra slides past the requested count", () => {
    const slides = parseScenarioResponse(response([slide, slide, slide]), 2);
    expect(slides).toHaveLength(2);
  });

  it("rejects too few slides rather than shipping a short carousel", () => {
    expect(() => parseScenarioResponse(response([slide]), 3)).toThrow(ScenarioResponseError);
  });

  it("rejects a slide with no headline", () => {
    expect(() => parseScenarioResponse(response([{ ...slide, headline: "" }]), 1)).toThrow(
      ScenarioResponseError,
    );
  });

  it("rejects a slide with no visual prompt", () => {
    expect(() => parseScenarioResponse(response([{ ...slide, visualPrompt: "" }]), 1)).toThrow(
      ScenarioResponseError,
    );
  });

  it("rejects unparseable and empty responses", () => {
    expect(() => parseScenarioResponse("not json", 1)).toThrow(ScenarioResponseError);
    expect(() => parseScenarioResponse(response([]), 1)).toThrow(ScenarioResponseError);
    expect(() => parseScenarioResponse(JSON.stringify({}), 1)).toThrow(ScenarioResponseError);
  });

  it("truncates rather than rejecting over-long copy", () => {
    const slides = parseScenarioResponse(response([{ ...slide, headline: "x".repeat(500) }]), 1);
    expect(slides[0].headline).toHaveLength(120);
  });
});

describe("mockScenario", () => {
  it("opens on a cover and closes on a cta", () => {
    const slides = mockScenario("Test post", 4);

    expect(slides).toHaveLength(4);
    expect(slides[0]).toMatchObject({ headline: "Test post", layout: "cover" });
    expect(slides[3].layout).toBe("cta");
    expect(slides[1].layout).toBe("statement");
  });
});
