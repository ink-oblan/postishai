import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";

const INSPECT_MODEL_ID = "models/gemini-flash-lite-latest";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const REJECTION_REASONS = [
  "no_person",
  "nsfw_or_illegal",
  "minor_sexualized",
  "violence_gore",
] as const;
type RejectionReason = (typeof REJECTION_REASONS)[number];

const WARNINGS = [
  "blurry",
  "low_resolution",
  "harsh_lighting",
  "multiple_people",
  "heavy_filter",
] as const;
type Warning = (typeof WARNINGS)[number];

const GENDERS = ["man", "woman", "neutral"] as const;
type Gender = (typeof GENDERS)[number];

interface InspectResult {
  decision: "accept" | "reject";
  rejectionReason: RejectionReason | null;
  rejectionMessage: string | null;
  warnings: Warning[];
  gender: Gender | null;
}

function parseBase64Image(imageBase64: string): { base64: string; mimeType: "image/jpeg" } | null {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) return null;
  const mimeType = "image/jpeg" as const;
  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  if (base64.length === 0) return null;
  return { base64, mimeType };
}

function coerceResult(raw: unknown): InspectResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const decision = obj.decision === "reject" ? "reject" : "accept";

  const rejectionReason =
    decision === "reject" &&
    typeof obj.rejectionReason === "string" &&
    (REJECTION_REASONS as readonly string[]).includes(obj.rejectionReason)
      ? (obj.rejectionReason as RejectionReason)
      : null;

  const rejectionMessage =
    decision === "reject" && typeof obj.rejectionMessage === "string" && obj.rejectionMessage.trim()
      ? obj.rejectionMessage.trim().slice(0, 200)
      : null;

  const warnings = Array.isArray(obj.warnings)
    ? Array.from(
        new Set(
          obj.warnings.filter(
            (w): w is Warning =>
              typeof w === "string" && (WARNINGS as readonly string[]).includes(w),
          ),
        ),
      )
    : [];

  const gender =
    typeof obj.gender === "string" && (GENDERS as readonly string[]).includes(obj.gender)
      ? (obj.gender as Gender)
      : null;

  return { decision, rejectionReason, rejectionMessage, warnings, gender };
}

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown) {
  const body = (await req.json()) as { imageBase64?: string };
  const image = parseBase64Image(body.imageBase64 ?? "");
  if (!image) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }
  const byteLength = Math.floor((image.base64.length * 3) / 4);
  if (byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 10 MB)" }, { status: 413 });
  }

  const prompt = await renderPromptTemplate("avatar-inspect-image-prompt.txt", {});
  const adapter = getLLMAdapter(INSPECT_MODEL_ID);

  let raw: string;
  try {
    raw = await adapter.generate(prompt, image);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Gemini safety filter blocking the call is itself a strong signal the image is unsafe.
    if (/blockReason|SAFETY|HARM_/i.test(message)) {
      return NextResponse.json({
        decision: "reject",
        rejectionReason: "nsfw_or_illegal",
        rejectionMessage: "This photo can't be used. Please try a different image.",
        warnings: [],
        gender: null,
      } satisfies InspectResult);
    }
    return NextResponse.json({ error: `Inspection failed: ${message}` }, { status: 502 });
  }

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Failed to parse inspection response" }, { status: 502 });
  }

  const result = coerceResult(parsed);
  if (!result) {
    return NextResponse.json({ error: "Unexpected inspection response shape" }, { status: 502 });
  }

  return NextResponse.json(result);
});
