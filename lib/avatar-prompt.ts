import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";

export type AvatarPromptVars = {
  gender: "man" | "woman" | "neutral";
  age: number;
  ethnicity: string;
  origin?: string;
  occupation: string;
};

let compiled: HandlebarsTemplateDelegate | null = null;

async function getTemplate(): Promise<HandlebarsTemplateDelegate> {
  if (!compiled) {
    const templatePath = path.join(process.cwd(), "app/api/prompts/avatar-prompt.txt");
    const source = await fs.readFile(templatePath, "utf-8");
    compiled = Handlebars.compile(source);
  }
  return compiled;
}

export async function renderAvatarPrompt(vars: AvatarPromptVars): Promise<string> {
  const template = await getTemplate();
  return template({
    genderLabel: vars.gender === "neutral" ? "gender-neutral human" : vars.gender,
    age: vars.age,
    ethnicity: vars.ethnicity,
    origin: vars.origin || undefined,
    occupation: vars.occupation,
  }).trim();
}
