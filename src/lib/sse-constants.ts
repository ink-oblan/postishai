// SSE status values and synthetic lifecycle events
export const SSE_STATUS = {
  ARCHIVED: "ARCHIVED",
} as const;

export type SSEStatus = (typeof SSE_STATUS)[keyof typeof SSE_STATUS];
