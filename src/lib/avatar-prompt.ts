import { renderPromptTemplate } from "@/lib/prompts";

export type AvatarPromptVars = {
  gender: "man" | "woman" | "neutral";
  age: number;
  ethnicity: string;
  origin?: string;
  occupation: string;
};

export async function renderAvatarPrompt(vars: AvatarPromptVars): Promise<string> {
  return renderPromptTemplate("avatar-prompt.txt", {
    genderLabel: vars.gender === "neutral" ? "gender-neutral human" : vars.gender,
    age: vars.age,
    ethnicity: vars.ethnicity,
    origin: vars.origin || undefined,
    occupation: vars.occupation,
  });
}
