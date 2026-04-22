import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

const PROMPTS_DIR = path.join(process.cwd(), "src/app/api/prompts");

const compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();

async function getPromptTemplate(file: string): Promise<HandlebarsTemplateDelegate> {
  const cached = compiledTemplates.get(file);
  if (cached) return cached;

  const source = await fs.readFile(path.join(PROMPTS_DIR, file), "utf-8");
  const compiled = Handlebars.compile(source, { noEscape: true });
  compiledTemplates.set(file, compiled);
  return compiled;
}

export async function renderPromptTemplate(
  file: string,
  vars: Record<string, unknown> = {},
): Promise<string> {
  const template = await getPromptTemplate(file);
  return template(vars).trim();
}
