import { Platform } from "@prisma/client";
import type { PlatformMetadata } from "./types";
import { getLLMAdapter } from "../llm-models/registry";
import { buildInstagramPrompt } from "./platforms/instagram";
import { buildTikTokPrompt } from "./platforms/tiktok";
import { buildYouTubeShortsPrompt } from "./platforms/youtube-shorts";

function buildPrompt(platform: Platform, script: string, title: string): string {
  switch (platform) {
    case "INSTAGRAM": return buildInstagramPrompt(script, title);
    case "TIKTOK": return buildTikTokPrompt(script, title);
    case "YOUTUBE_SHORTS": return buildYouTubeShortsPrompt(script, title);
  }
}

function parseResponse(platform: Platform, raw: string): PlatformMetadata {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  switch (platform) {
    case "INSTAGRAM":
      return { platform: "INSTAGRAM", caption: parsed.caption, hashtags: parsed.hashtags ?? [] };
    case "TIKTOK":
      return { platform: "TIKTOK", caption: parsed.caption, hashtags: parsed.hashtags ?? [] };
    case "YOUTUBE_SHORTS":
      return {
        platform: "YOUTUBE_SHORTS",
        title: parsed.title,
        description: parsed.description,
        tags: parsed.tags ?? [],
      };
  }
}

export async function generateMetadata(
  platform: Platform,
  script: string,
  title: string,
  llmModelId: string
): Promise<PlatformMetadata> {
  const adapter = getLLMAdapter(llmModelId);
  const prompt = buildPrompt(platform, script, title);
  const raw = await adapter.generate(prompt);
  return parseResponse(platform, raw);
}

export function metadataToText(metadata: PlatformMetadata): string {
  switch (metadata.platform) {
    case "INSTAGRAM":
    case "TIKTOK": {
      const hashtags = metadata.hashtags.map((h) => `#${h}`).join(" ");
      return `CAPTION\n------\n${metadata.caption}\n\nHASHTAGS\n--------\n${hashtags}`;
    }
    case "YOUTUBE_SHORTS":
      return `TITLE\n-----\n${metadata.title}\n\nDESCRIPTION\n-----------\n${metadata.description}\n\nTAGS\n----\n${metadata.tags.join(", ")}`;
  }
}
