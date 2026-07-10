/**
 * Polling configuration for status updates across the application.
 *
 * This centralized configuration ensures consistent polling intervals
 * across all generation workflows (video, caption, avatar, variations).
 *
 * The 4-second interval balances:
 * - Responsiveness: 4s is fast enough for good UX
 * - Server load: Reduces unnecessary API calls compared to 2-3s intervals
 * - Network efficiency: Reasonable compromise for polling-based updates
 */

export const POLLING_INTERVAL_MS = 4000; // 4 seconds

/**
 * Specific polling intervals for different operations
 */
export const POLLING = {
  /** General status updates (posts, avatars, captions) */
  STATUS: POLLING_INTERVAL_MS,

  /** SSE stats refresh rate */
  SSE_STATS: POLLING_INTERVAL_MS,

  /** HeyGen video status polling */
  HEYGEN_STATUS: POLLING_INTERVAL_MS,

  /** Metadata generation polling */
  METADATA: POLLING_INTERVAL_MS,

  /** Avatar variations polling */
  AVATAR_VARIATIONS: POLLING_INTERVAL_MS,

  /** UI timer updates (elapsed time display) */
  UI_TIMER: 1000, // 1 second for smooth elapsed time display
} as const;
