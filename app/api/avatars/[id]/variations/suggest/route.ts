import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLLMAdapter } from "@/lib/llm-models/registry";

const SUGGEST_MODEL_ID = "models/gemini-flash-lite-latest";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avatar = await prisma.avatar.findUnique({ where: { id } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = [
    "You are a creative director for social media video content.",
    "Suggest one visually interesting variation for the following avatar:",
    "",
    `Avatar: ${avatar.age}-year-old ${avatar.ethnicity}${avatar.origin ? ` from ${avatar.origin}` : ""} ${avatar.occupation} (${avatar.gender})`,
    "",
    "Suggest clothes, background, and pose that would look compelling for a short-form social video.",
    "Keep each field under 15 words.",
    "",
    'Respond ONLY with a JSON object, no markdown: {"clothes": "...", "background": "...", "pose": "..."}',
  ].join("\n");

  const adapter = getLLMAdapter(SUGGEST_MODEL_ID);
  const raw = await adapter.generate(prompt);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let suggestion: { clothes: string; background: string; pose: string };
  try {
    suggestion = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Failed to parse LLM response" }, { status: 502 });
  }

  if (
    typeof suggestion.clothes !== "string" ||
    typeof suggestion.background !== "string" ||
    typeof suggestion.pose !== "string"
  ) {
    return NextResponse.json({ error: "Unexpected LLM response shape" }, { status: 502 });
  }

  return NextResponse.json({
    clothes: suggestion.clothes.trim(),
    background: suggestion.background.trim(),
    pose: suggestion.pose.trim(),
  });
}
