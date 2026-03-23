import type { ImageModelAdapter, ImageModelInfo } from "./types";
import { NanaBanana2Adapter, NanaBananaProAdapter } from "./adapters/nano-banana";

const adapters = new Map<string, ImageModelAdapter>();

function register(adapter: ImageModelAdapter) {
  adapters.set(adapter.id, adapter);
}

register(new NanaBanana2Adapter());
register(new NanaBananaProAdapter());

export const DEFAULT_IMAGE_MODEL_ID = "nano-banana-2";

export function getImageAdapter(id: string): ImageModelAdapter {
  const adapter = adapters.get(id);
  if (!adapter) throw new Error(`Unknown image model: ${id}`);
  return adapter;
}

export function listImageModels(): ImageModelInfo[] {
  return Array.from(adapters.values()).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}
