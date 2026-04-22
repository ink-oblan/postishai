import { renderPromptTemplate } from "@/lib/prompts";

export function buildInstagramPrompt(script: string, title: string): Promise<string> {
  return renderPromptTemplate("metadata-instagram-prompt.txt", { script, title });
}
