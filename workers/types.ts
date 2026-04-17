import type { Job, Prisma, PrismaClient } from "@prisma/client";

export type AvatarGeneratePayload = {
  avatarId: string;
  prompt: string;
  imageModel: string;
};

export type AvatarVariationGeneratePayload = {
  variationId: string;
  prompt: string;
  imageModel: string;
};

export type PostGeneratePayload = {
  postId: string;
};

export type PostMetadataGeneratePayload = {
  postId: string;
};

export type JobPayloadMap = {
  "avatar.generate": AvatarGeneratePayload;
  "avatar.variation.generate": AvatarVariationGeneratePayload;
  "post.metadata": PostMetadataGeneratePayload;
  "post.generate": PostGeneratePayload;
};

export type JobType = keyof JobPayloadMap;

export type WorkerDb = PrismaClient | Prisma.TransactionClient;

export type JobFailureKind = "retryable" | "permanent";

export type JobRunContext = {
  db: PrismaClient;
  workerId: string;
  log: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
};

export type JobDefinition<T extends JobType = JobType, TResult = unknown> = {
  type: T;
  timeoutMs: number;
  maxAttempts: number;
  dedupeKey: (payload: JobPayloadMap[T]) => string;
  parse: (rawPayload: string) => JobPayloadMap[T];
  onEnqueue?: (db: WorkerDb, payload: JobPayloadMap[T], job: Job) => Promise<void>;
  onStart?: (db: WorkerDb, payload: JobPayloadMap[T], job: Job) => Promise<void>;
  run: (ctx: JobRunContext, payload: JobPayloadMap[T], job: Job) => Promise<TResult>;
  onSuccess?: (db: WorkerDb, payload: JobPayloadMap[T], result: TResult, job: Job) => Promise<void>;
  onFailure?: (db: WorkerDb, payload: JobPayloadMap[T], error: string, job: Job) => Promise<void>;
  classifyError: (error: unknown) => JobFailureKind;
};
