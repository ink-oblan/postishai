import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";

const SUGGEST_MODEL_ID = "models/gemini-flash-lite-latest";

export const POST = withAuth(async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let avatarDescription: string;
  if (avatar.analysisDescription?.trim()) {
    avatarDescription = avatar.analysisDescription.trim();
  } else {
    const parts = [
      avatar.age ? `${avatar.age}-year-old` : null,
      avatar.origin ?? null,
      avatar.occupation ?? avatar.gender ?? "character",
      avatar.occupation && avatar.gender ? `(${avatar.gender})` : null,
    ].filter(Boolean);
    avatarDescription = parts.join(" ");
  }
  const prompt = await renderPromptTemplate("avatar-variation-suggest-prompt.txt", {
    avatarDescription,
  });

  const adapter = getLLMAdapter(SUGGEST_MODEL_ID);
  const raw = await adapter.generate(prompt);
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

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
});
