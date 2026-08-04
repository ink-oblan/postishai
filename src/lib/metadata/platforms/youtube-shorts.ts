import type { CaptionInput } from "@/lib/metadata/types";
import { renderPromptTemplate } from "@/lib/prompts";

export function buildYouTubeShortsPrompt(input: CaptionInput, title: string): Promise<string> {
  return renderPromptTemplate("metadata-youtube-shorts-prompt.txt", {
    title,
    script: "script" in input ? input.script : undefined,
    visualDescriptions: "visualDescriptions" in input ? input.visualDescriptions : undefined,
    details: input.details,
  });
}
