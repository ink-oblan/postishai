import type { Platform } from "@prisma/client";
import { getLLMAdapter } from "../llm-models/registry";
import { buildInstagramPrompt } from "./platforms/instagram";
import { buildTikTokPrompt } from "./platforms/tiktok";
import { buildYouTubeShortsPrompt } from "./platforms/youtube-shorts";
import type { CaptionInput, PlatformMetadata } from "./types";

function buildPrompt(platform: Platform, input: CaptionInput, title: string): Promise<string> {
  switch (platform) {
    case "INSTAGRAM":
      return buildInstagramPrompt(input, title);
    case "TIKTOK":
      return buildTikTokPrompt(input, title);
    case "YOUTUBE_SHORTS":
      return buildYouTubeShortsPrompt(input, title);
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
  input: CaptionInput,
  llmModelId: string,
): Promise<PlatformMetadata> {
  const adapter = getLLMAdapter(llmModelId);
  const title = "title" in input ? (input.title ?? "") : "";
  const prompt = await buildPrompt(platform, input, title);
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
