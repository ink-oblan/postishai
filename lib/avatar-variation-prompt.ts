import { renderPromptTemplate } from "@/lib/prompts";

export type AvatarVariationPromptVars = {
  clothes?: string;
  background?: string;
  pose?: string;
};

export async function renderAvatarVariationPrompt(
  vars: AvatarVariationPromptVars,
  isUploaded: boolean,
): Promise<string> {
  const file = isUploaded ? "avatar-variation-prompt-uploaded.txt" : "avatar-variation-prompt.txt";
  return renderPromptTemplate(file, {
    clothes: vars.clothes || undefined,
    background: vars.background || undefined,
    pose: vars.pose || undefined,
  });
}
