import type { LLMModelAdapter, LLMModelInfo } from "./types";
import { GeminiAdapter } from "./adapters/gemini";

const adapters = new Map<string, LLMModelAdapter>();

function register(adapter: LLMModelAdapter) {
  adapters.set(adapter.id, adapter);
}

register(new GeminiAdapter("models/gemini-flash-lite-latest", "Gemini Flash Lite Latest", "Lowest-latency Gemini alias for lightweight text generation"));
register(new GeminiAdapter("models/gemini-flash-latest", "Gemini Flash Latest", "Fast general-purpose Gemini alias for text generation"));
register(new GeminiAdapter("models/gemini-pro-latest", "Gemini Pro Latest", "Frontier Gemini alias for high-quality text generation"));
register(new GeminiAdapter("gemini-3-flash-preview", "Gemini 3 Flash", "Fast and capable, ideal for content generation"));
register(new GeminiAdapter("gemini-3.1-pro-preview", "Gemini 3.1 Pro", "Most capable, best quality metadata"));

export const DEFAULT_LLM_MODEL_ID = "gemini-3-flash-preview";

export function getLLMModelInfo(id: string): LLMModelInfo | undefined {
  const adapter = adapters.get(id);
  if (!adapter) return undefined;
  return { id: adapter.id, name: adapter.name, description: adapter.description };
}

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
