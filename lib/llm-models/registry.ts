import type { LLMModelAdapter, LLMModelInfo } from "./types";
import { GeminiAdapter } from "./adapters/gemini";

const adapters = new Map<string, LLMModelAdapter>();

function register(adapter: LLMModelAdapter) {
  adapters.set(adapter.id, adapter);
}

register(new GeminiAdapter("gemini-2.0-flash", "Gemini 2.0 Flash", "Fast and capable, ideal for content generation"));
register(new GeminiAdapter("gemini-2.5-flash-preview-04-17", "Gemini 2.5 Flash", "Latest preview model with enhanced reasoning"));
register(new GeminiAdapter("gemini-2.5-pro-preview-03-25", "Gemini 2.5 Pro", "Most capable Gemini model"));

export const DEFAULT_LLM_MODEL_ID = "gemini-2.0-flash";

export function getLLMAdapter(id: string): LLMModelAdapter {
  const adapter = adapters.get(id);
  if (!adapter) throw new Error(`Unknown LLM model: ${id}`);
  return adapter;
}

export function listLLMModels(): LLMModelInfo[] {
  return Array.from(adapters.values()).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}
