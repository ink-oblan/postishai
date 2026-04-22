import { renderPromptTemplate } from "@/lib/prompts";

export function buildYouTubeShortsPrompt(script: string, title: string): Promise<string> {
  return renderPromptTemplate("metadata-youtube-shorts-prompt.txt", { script, title });
}
