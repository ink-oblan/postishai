import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";

export type AvatarVariationPromptVars = {
  clothes?: string;
  background?: string;
  pose?: string;
};

const compiled: Record<string, HandlebarsTemplateDelegate> = {};

async function getTemplate(file: string): Promise<HandlebarsTemplateDelegate> {
  if (!compiled[file]) {
    const templatePath = path.join(process.cwd(), "app/api/prompts", file);
    const source = await fs.readFile(templatePath, "utf-8");
    compiled[file] = Handlebars.compile(source);
  }
  return compiled[file];
}

export async function renderAvatarVariationPrompt(vars: AvatarVariationPromptVars, isUploaded: boolean): Promise<string> {
  const file = isUploaded ? "avatar-variation-prompt-uploaded.txt" : "avatar-variation-prompt.txt";
  const template = await getTemplate(file);
  return template({
    clothes: vars.clothes || undefined,
    background: vars.background || undefined,
    pose: vars.pose || undefined,
  }).trim();
}
