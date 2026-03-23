export interface InstagramMetadata {
  platform: "INSTAGRAM";
  caption: string;
  hashtags: string[];
}

export interface TikTokMetadata {
  platform: "TIKTOK";
  caption: string;
  hashtags: string[];
}

export interface YouTubeShortsMetadata {
  platform: "YOUTUBE_SHORTS";
  title: string;
  description: string;
  tags: string[];
}

export type PlatformMetadata = InstagramMetadata | TikTokMetadata | YouTubeShortsMetadata;
