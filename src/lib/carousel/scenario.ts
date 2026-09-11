import type { BrandProfile, Platform } from "@prisma/client";
import { EMOJI_LEVEL_LABELS } from "@/lib/brand-fields";
import { DEFAULT_LAYOUT, isLayoutName, type LayoutName } from "@/lib/design/layouts";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";
import { PLATFORM_LABELS } from "@/lib/utils";

export interface ScenarioSlide {
  headline: string;
  body: string;
  visualPrompt: string;
  layout: LayoutName;
}

export class ScenarioResponseError extends Error {}

export const MAX_HEADLINE = 120;
export const MAX_BODY = 400;
export const MAX_VISUAL_PROMPT = 400;

export function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function coerceLayout(value: unknown): LayoutName {
  return isLayoutName(value) ? value : DEFAULT_LAYOUT;
}

function brandVars(brand: BrandProfile | null) {
  if (!brand) return null;

  return {
    brandName: brand.brandName,
    topic: brand.topic,
    targetAudience: brand.targetAudience,
    mission: brand.mission ?? "",
    voiceStyle: brand.voiceStyle ?? "",
    brandVocabulary: brand.brandVocabulary ?? "",
    photoStyle: brand.photoStyle ?? "",
    formalityLabel: brand.youFormality ? "casually, as 'you'" : "formally",
    emojiLabel: EMOJI_LEVEL_LABELS[brand.emojiLevel] ?? EMOJI_LEVEL_LABELS[0],
  };
}

export function buildScenarioPrompt(options: {
  title: string;
  platform: Platform;
  slideCount: number;
  details?: string | null;
  brand: BrandProfile | null;
}): Promise<string> {
  return renderPromptTemplate("carousel-scenario-prompt.txt", {
    title: options.title,
    platformLabel: PLATFORM_LABELS[options.platform],
    slideCount: options.slideCount,
    details: options.details?.trim() || null,
    brand: brandVars(options.brand),
  });
}

export function parseScenarioResponse(raw: string, slideCount: number): ScenarioSlide[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ScenarioResponseError("Failed to parse the model's response");
  }

  const slides =
    typeof parsed === "object" && parsed !== null ? (parsed as { slides?: unknown }).slides : null;
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new ScenarioResponseError("The model returned no slides");
  }

  const shaped = slides.slice(0, slideCount).map((raw): ScenarioSlide => {
    const entry = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const headline = clampText(entry.headline, MAX_HEADLINE);
    const visualPrompt = clampText(entry.visualPrompt, MAX_VISUAL_PROMPT);

    if (!headline || !visualPrompt) {
      throw new ScenarioResponseError("The model returned a slide without a headline or visual");
    }

    return {
      headline,
      body: clampText(entry.body, MAX_BODY),
      visualPrompt,
      layout: coerceLayout(entry.layout),
    };
  });

  if (shaped.length < slideCount) {
    throw new ScenarioResponseError(
      `The model returned ${shaped.length} slides, expected ${slideCount}`,
    );
  }

  return shaped;
}

/**
 * Deliberately awkward copy: wide glyphs, unbreakable long words and near-miss line lengths are
 * exactly what the line-count estimate gets wrong, so the mock carousel is worth rendering as a
 * test of the layout rather than only of the plumbing.
 */
const MOCK_HEADLINES = [
  "The Evolution of Performance",
  "Why momentum compounds quietly",
  "WHAT NOBODY MENTIONS ABOUT MOMENTUM",
  "Small wins, remarkable outcomes",
  "Uncompromising commitment, measured",
  "Room to grow",
  "Workmanship & Wonder",
];

const MOCK_BODIES = [
  "Discover the innovation behind the new Air Force 2.0. Prepare for your ultimate victory.",
  "",
  "- Show up on the worst days\n- Measure the boring numbers\n- Let the compounding do the rest",
  "A single sentence of supporting copy that runs just long enough to wrap onto a second line.",
  "Consistency outperforms intensity over any horizon that actually matters to your business.",
];

const MOCK_MIDDLE_LAYOUTS: LayoutName[] = ["statement", "list", "quote"];

export function mockScenario(title: string, slideCount: number): ScenarioSlide[] {
  return Array.from({ length: slideCount }, (_, index) => {
    const layout: LayoutName =
      index === 0
        ? "cover"
        : index === slideCount - 1
          ? "cta"
          : MOCK_MIDDLE_LAYOUTS[(index - 1) % MOCK_MIDDLE_LAYOUTS.length];

    return {
      headline: index === 0 ? title : MOCK_HEADLINES[index % MOCK_HEADLINES.length],
      body: layout === "list" ? MOCK_BODIES[2] : MOCK_BODIES[index % MOCK_BODIES.length],
      visualPrompt: `Mock background ${index + 1}: soft gradient with generous empty space`,
      layout,
    };
  });
}

export async function generateScenario(options: {
  title: string;
  platform: Platform;
  slideCount: number;
  details?: string | null;
  brand: BrandProfile | null;
  llmModelId: string;
}): Promise<ScenarioSlide[]> {
  const prompt = await buildScenarioPrompt(options);
  const raw = await getLLMAdapter(options.llmModelId).generate(prompt);
  return parseScenarioResponse(raw, options.slideCount);
}
