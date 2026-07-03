import { ETHNICITIES, isEthnicity } from "@/lib/ethnicities";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";
import { readFile } from "@/lib/storage";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition } from "@/workers/types";

const ANALYZE_MODEL_ID = "models/gemini-flash-lite-latest";

type AvatarAnalyzeResult = {
  age: number | null;
  origin: string | null;
  occupation: string | null;
  description: string;
};

function coerceAnalysis(raw: unknown): AvatarAnalyzeResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const ageValue =
    typeof obj.age === "number" && Number.isFinite(obj.age)
      ? Math.max(1, Math.min(120, Math.round(obj.age)))
      : null;

  const originValue = isEthnicity(obj.origin) ? obj.origin : null;

  const occupationValue =
    typeof obj.occupation === "string" && obj.occupation.trim()
      ? obj.occupation.trim().slice(0, 80)
      : null;

  const description =
    typeof obj.description === "string" ? obj.description.trim().slice(0, 600) : "";
  if (!description) return null;

  return { age: ageValue, origin: originValue, occupation: occupationValue, description };
}

export const avatarAnalyzeJob: JobDefinition<"avatar.analyze", AvatarAnalyzeResult> = {
  type: "avatar.analyze",
  timeoutMs: 3 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ avatarId }) => `avatar.analyze:${avatarId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return { avatarId: readRequiredString(payload, "avatarId") };
  },
  async run(ctx, payload) {
    const { avatarId } = payload;
    ctx.log(`[avatar.analyze] start avatarId=${avatarId}`);

    const avatar = await ctx.db.avatar.findUnique({ where: { id: avatarId } });
    if (!avatar) throw new Error(`Avatar ${avatarId} not found`);
    if (!avatar.imagePath) throw new Error(`Avatar ${avatarId} has no imagePath`);

    const buffer = await readFile(avatar.imagePath);
    const mimeType = "image/jpeg" as const;

    const prompt = await renderPromptTemplate("avatar-analyze-image-prompt.txt", {
      ethnicities: ETHNICITIES,
    });

    const adapter = getLLMAdapter(ANALYZE_MODEL_ID);
    const raw = await adapter.generate(prompt, { base64: buffer.toString("base64"), mimeType });

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse analysis JSON: ${cleaned.slice(0, 200)}`);
    }

    const result = coerceAnalysis(parsed);
    if (!result) throw new Error("Unexpected analysis response shape");

    ctx.log(
      `[avatar.analyze] parsed age=${result.age} origin=${result.origin} occupation=${result.occupation}`,
    );
    return result;
  },
  async onSuccess(db, payload, result) {
    await db.avatar.update({
      where: { id: payload.avatarId },
      data: {
        age: result.age,
        origin: result.origin,
        occupation: result.occupation,
        analysisDescription: result.description,
      },
    });
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
