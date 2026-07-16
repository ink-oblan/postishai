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

// All general status values
export type AllStatus = ContentStatus;

// Generate UI display labels from status constants
function generateStatusLabels() {
  const labels: Record<string, string> = {};

  // Content status labels
  for (const [key, value] of Object.entries(CONTENT_STATUS)) {
    labels[value] = key.charAt(0) + key.slice(1).toLowerCase();
  }

  return labels as Record<AllStatus, string>;
}

export const STATUS_LABELS = generateStatusLabels();

export function getStatusLabel(status: AllStatus): string {
  return STATUS_LABELS[status] ?? status;
}
