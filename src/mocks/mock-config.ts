// Unified mock mode configuration for testing SSE flows
// Set NEXT_PUBLIC_MOCK_MODE="true" to enable mock generation for:
// - Avatar images (10 seconds)
// - Post videos (15 seconds)
// - Post captions (5 seconds)

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Mock generation times
export const MOCK_TIMINGS = {
  AVATAR_IMAGE: 10000, // 10 seconds for avatar image generation
  POST_VIDEO: 15000, // 15 seconds for video generation
  POST_CAPTION: 5000, // 5 seconds for caption generation
} as const;

export function isMockEnabled(): boolean {
  return MOCK_MODE;
}
