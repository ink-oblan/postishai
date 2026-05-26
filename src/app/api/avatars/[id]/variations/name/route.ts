import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";

const NAME_MODEL_ID = "models/gemini-flash-lite-latest";

export const POST = withAuth(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const avatar = await prisma.avatar.findFirst({ where: { id, userId } });
  if (!avatar) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { clothes?: string; background?: string; pose?: string };
  const { clothes, background, pose } = body;

  if (!clothes && !background && !pose) {
    return NextResponse.json({ error: "At least one field required" }, { status: 400 });
  }

  const prompt = await renderPromptTemplate("avatar-variation-name-prompt.txt", {
    clothes: clothes?.trim() || null,
    background: background?.trim() || null,
    pose: pose?.trim() || null,
  });

  const adapter = getLLMAdapter(NAME_MODEL_ID);
  const raw = await adapter.generate(prompt);
  const name = raw.trim().replace(/^["']|["']$/g, "").trim();

  return NextResponse.json({ name });
});
