import { renderPromptTemplate } from "@/lib/prompts";

export function buildTikTokPrompt(script: string, title: string): Promise<string> {
  return renderPromptTemplate("metadata-tiktok-prompt.txt", { script, title });
}
