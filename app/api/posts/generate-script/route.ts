import { NextRequest, NextResponse } from "next/server";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";

let compiled: HandlebarsTemplateDelegate | null = null;

async function getTemplate(): Promise<HandlebarsTemplateDelegate> {
  if (!compiled) {
    const templatePath = path.join(process.cwd(), "app/api/prompts/script-generate-prompt.txt");
    const source = await fs.readFile(templatePath, "utf-8");
    compiled = Handlebars.compile(source);
  }
  return compiled;
}

export async function POST(req: NextRequest) {
  const { title, platform, details, llmModelId } = await req.json();

  if (!llmModelId) {
    return NextResponse.json({ error: "llmModelId is required" }, { status: 400 });
  }

  const platformLabel =
    platform === "INSTAGRAM" ? "Instagram Reels" :
    platform === "TIKTOK" ? "TikTok" :
    platform === "YOUTUBE_SHORTS" ? "YouTube Shorts" :
    "short-form video";

  const template = await getTemplate();
  const prompt = template({ platformLabel, title, details: details?.trim() });

  try {
    const adapter = getLLMAdapter(llmModelId);
    const script = await adapter.generate(prompt);
    return NextResponse.json({ script: script.trim() });
  } catch (err) {
    console.error("Script generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Script generation failed" },
      { status: 500 }
    );
  }
}
