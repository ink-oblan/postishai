// Unified mock mode configuration for testing SSE flows
// Set MOCK_MODE="true" to enable mock generation for:
// - Avatar images (10 seconds)
// - Post videos (15 seconds)
// - Post captions (5 seconds)
// - Carousel plans (10 seconds)

export const MOCK_MODE = process.env.MOCK_MODE === "true";

// Mock generation times
export const MOCK_TIMINGS = {
  AVATAR_IMAGE: 10000, // 10 seconds for avatar image generation
  POST_VIDEO: 15000, // 15 seconds for video generation
  POST_CAPTION: 5000, // 5 seconds for caption generation
  CAROUSEL_SLIDE: 3000, // 3 seconds per carousel slide background
  CAROUSEL_SCENARIO: 10000, // 10 seconds to plan a carousel
} as const;

export function isMockEnabled(): boolean {
  return MOCK_MODE;
}

/** Stands in for the time a real model would take, so the UI's waiting states get exercised. */
export function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
