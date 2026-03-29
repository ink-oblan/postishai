import type { LLMModelAdapter, LLMModelInfo } from "./types";
import { GeminiAdapter } from "./adapters/gemini";

const adapters = new Map<string, LLMModelAdapter>();

function register(adapter: LLMModelAdapter) {
  adapters.set(adapter.id, adapter);
}

register(new GeminiAdapter("gemini-3-flash-preview", "Gemini 3 Flash", "Fast and capable, ideal for content generation"));
register(new GeminiAdapter("gemini-3.1-pro-preview", "Gemini 3.1 Pro", "Most capable, best quality metadata"));

export const DEFAULT_LLM_MODEL_ID = "gemini-3-flash-preview";

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
