export const POST_STATUS = {
  DRAFT: "DRAFT",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type PostStatusValue = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const AVATAR_STATUS = {
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type AvatarStatusValue = (typeof AVATAR_STATUS)[keyof typeof AVATAR_STATUS];

export const VARIATION_STATUS = {
  PENDING: "PENDING",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type VariationStatusValue = (typeof VARIATION_STATUS)[keyof typeof VARIATION_STATUS];

export const METADATA_STATUS = {
  IDLE: "IDLE",
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type MetadataStatusValue = (typeof METADATA_STATUS)[keyof typeof METADATA_STATUS];

export const JOB_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type JobStatusValue = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const STATUS_LABELS: Record<PostStatusValue, string> = {
  [POST_STATUS.DRAFT]: "Draft",
  [POST_STATUS.GENERATING]: "Generating",
  [POST_STATUS.COMPLETED]: "Completed",
  [POST_STATUS.FAILED]: "Failed",
};
