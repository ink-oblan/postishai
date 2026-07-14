// Content lifecycle status constants (Prisma enums)
export const CONTENT_STATUS = {
  DRAFT: "DRAFT",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];

// Job queue status constants (internal background job processing)
export const JOB_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// SSE status values and synthetic lifecycle events
export const SSE_STATUS = {
  ARCHIVED: "ARCHIVED",
} as const;

export type SSEStatus = (typeof SSE_STATUS)[keyof typeof SSE_STATUS];

// All possible status values (content + SSE)
export type AllStatus = ContentStatus | SSEStatus;

// Generate UI display labels from status constants
function generateStatusLabels() {
  const labels: Record<string, string> = {};

  // Content status labels
  for (const [key, value] of Object.entries(CONTENT_STATUS)) {
    labels[value] = key.charAt(0) + key.slice(1).toLowerCase();
  }

  // SSE status labels
  for (const [key, value] of Object.entries(SSE_STATUS)) {
    labels[value] = key.charAt(0) + key.slice(1).toLowerCase();
  }

  return labels as Record<AllStatus, string>;
}

export const STATUS_LABELS = generateStatusLabels();

export function getStatusLabel(status: AllStatus): string {
  return STATUS_LABELS[status] ?? status;
}
