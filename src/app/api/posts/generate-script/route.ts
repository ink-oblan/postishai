import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import { renderPromptTemplate } from "@/lib/prompts";

export const POST = withAuth(async function POST(req: NextRequest) {
  const { title, platform, details, llmModelId } = await req.json();

  if (!llmModelId) {
    return NextResponse.json({ error: "llmModelId is required" }, { status: 400 });
  }

  const platformLabel =
    platform === "INSTAGRAM"
      ? "Instagram Reels"
      : platform === "TIKTOK"
        ? "TikTok"
        : platform === "YOUTUBE_SHORTS"
          ? "YouTube Shorts"
          : "short-form video";

  const prompt = await renderPromptTemplate("script-generate-prompt.txt", {
    platformLabel,
    title,
    details: details?.trim(),
  });

  try {
    const adapter = getLLMAdapter(llmModelId);
    const script = await adapter.generate(prompt);
    return NextResponse.json({ script: script.trim() });
  } catch (err) {
    console.error("Script generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Script generation failed" },
      { status: 500 },
    );
  }
});
