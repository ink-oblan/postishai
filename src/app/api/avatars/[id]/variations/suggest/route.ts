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

  const avatarDescription = `${avatar.age}-year-old ${avatar.origin ? `${avatar.origin} ` : ""}${avatar.occupation} (${avatar.gender})`;
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
