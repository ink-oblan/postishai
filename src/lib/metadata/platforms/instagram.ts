import type { CaptionInput } from "@/lib/metadata/types";
import { renderPromptTemplate } from "@/lib/prompts";

export function buildInstagramPrompt(input: CaptionInput, title: string): Promise<string> {
  return renderPromptTemplate("metadata-instagram-prompt.txt", {
    title,
    script: "script" in input ? input.script : undefined,
    visualDescriptions: "visualDescriptions" in input ? input.visualDescriptions : undefined,
    details: input.details,
  });
}
