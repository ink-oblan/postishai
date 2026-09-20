import { describe, expect, it } from "vitest";
import {
  buildSlideRewritePrompt,
  mockScenario,
  parseScenarioResponse,
  ScenarioResponseError,
  type ScenarioSlideContext,
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

describe("buildSlideRewritePrompt", () => {
  const plan: ScenarioSlideContext[] = [
    { headline: "The hook", body: "", layout: "cover" },
    { headline: "The middle", body: "Supporting line.", layout: "statement" },
    { headline: "The close", body: "", layout: "cta" },
  ];

  const build = (index: number) =>
    buildSlideRewritePrompt({
      title: "Test post",
      platform: "INSTAGRAM",
      details: null,
      brand: null,
      slides: plan,
      index,
    });

  it("asks for one slide and shows the rest of the plan as context", async () => {
    const prompt = await build(1);

    expect(prompt).toContain("REWRITE SLIDE 2");
    expect(prompt).toContain("Return JSON only, one slide");
    expect(prompt).toContain("The hook");
    expect(prompt).toContain("The close");
    expect(prompt).toContain("Supporting line.");
    expect(prompt).toMatch(/Slide 2 \[statement\] {2}<-- REWRITE THIS ONE/);
  });

  it("pins the layout the sequence depends on and frees the ones it does not", async () => {
    expect(await build(0)).toContain('keep "cover"');
    expect(await build(2)).toContain('keep "cta"');
    expect(await build(1)).toContain('one of "statement", "list" or "quote"');
  });
});
