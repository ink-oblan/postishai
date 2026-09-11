import { JOB_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { jobRegistry } from "@/workers/registry";
import type {
  AvatarAnalyzePayload,
  AvatarGeneratePayload,
  AvatarVariationGeneratePayload,
  CarouselSlideImagePayload,
  JobDefinition,
  JobPayloadMap,
  JobType,
  PostGeneratePayload,
  PostMetadataGeneratePayload,
  WorkerDb,
} from "@/workers/types";

type ActiveJobStatus = typeof JOB_STATUS.PENDING | typeof JOB_STATUS.PROCESSING;

export type {
  AvatarAnalyzePayload,
  AvatarGeneratePayload,
  AvatarVariationGeneratePayload,
  CarouselSlideImagePayload,
  JobPayloadMap,
  JobType,
  PostGeneratePayload,
  PostMetadataGeneratePayload,
};

export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayloadMap[T],
): Promise<{ created: boolean; jobId: string }> {
  return enqueueJobInDb(prisma, type, payload);
}

export async function enqueueJobInDb<T extends JobType>(
  db: WorkerDb,
  type: T,
  payload: JobPayloadMap[T],
): Promise<{ created: boolean; jobId: string }> {
  const definition = jobRegistry[type] as unknown as JobDefinition<T, unknown>;
  const dedupeKey = definition.dedupeKey(payload);

  const run = async (tx: WorkerDb) => {
    const existing = await tx.job.findFirst({
      where: {
        type,
        dedupeKey,
        status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] satisfies ActiveJobStatus[] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return { created: false, jobId: existing.id };
    }

    const job = await tx.job.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        dedupeKey,
        maxAttempts: definition.maxAttempts,
        runAfter: new Date(),
      },
    });

    await definition.onEnqueue?.(tx, payload, job);

    return { created: true, jobId: job.id };
  };

  if ("$transaction" in db) {
    return db.$transaction(run);
  }

  return run(db);
}

/**
 * Cheap, non-authoritative check for an already-active job with the same dedupe key.
 * Lets callers reject a duplicate request (409) before performing side effects, without
 * relying on the enqueue transaction (which remains the source of truth for deduplication).
 *
 * Takes only the fields the dedupe key is built from, so callers that have not assembled a
 * full payload yet do not have to invent one.
 */
export async function hasActiveJob<T extends JobType>(
  type: T,
  dedupeInput: Partial<JobPayloadMap[T]>,
): Promise<boolean> {
  const definition = jobRegistry[type] as unknown as JobDefinition<T, unknown>;
  const dedupeKey = definition.dedupeKey(dedupeInput as JobPayloadMap[T]);
  const existing = await prisma.job.findFirst({
    where: {
      type,
      dedupeKey,
      status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] satisfies ActiveJobStatus[] },
    },
  });
  return existing !== null;
}

export function enqueueAvatarGenerateJob(payload: AvatarGeneratePayload) {
  return enqueueJob("avatar.generate", payload);
}

export function enqueueAvatarVariationGenerateJob(payload: AvatarVariationGeneratePayload) {
  return enqueueJob("avatar.variation.generate", payload);
}

export function enqueueAvatarAnalyzeJob(payload: AvatarAnalyzePayload) {
  return enqueueJob("avatar.analyze", payload);
}

export function enqueuePostMetadataGenerateJob(payload: PostMetadataGeneratePayload) {
  return enqueueJob("post.metadata.generate", payload);
}

export function enqueuePostGenerateJob(payload: PostGeneratePayload) {
  return enqueueJob("post.generate", payload);
}

export function enqueueCarouselSlideImageJob(payload: CarouselSlideImagePayload) {
  return enqueueJob("carousel.slide.image.generate", payload);
}
