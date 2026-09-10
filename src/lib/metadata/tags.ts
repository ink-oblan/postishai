import { POST_TAG_MAX_COUNT, POST_TAG_MAX_LENGTH } from "@/lib/constants";

export function normalizeTagList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const tags = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const tag = value.trim().replace(/^#/, "").slice(0, POST_TAG_MAX_LENGTH);
    if (!tag) continue;
    tags.add(tag);
    if (tags.size === POST_TAG_MAX_COUNT) break;
  }
  return [...tags];
}
