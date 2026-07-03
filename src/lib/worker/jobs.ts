import { prisma } from "@/lib/db";
import { jobRegistry } from "@/workers/registry";
import type {
  AvatarAnalyzePayload,
  AvatarGeneratePayload,
  AvatarVariationGeneratePayload,
  JobDefinition,
  JobPayloadMap,
  JobType,
  PostCaptionGeneratePayload,
  PostGeneratePayload,
  PostMetadataGeneratePayload,
  WorkerDb,
} from "@/workers/types";

type ActiveJobStatus = "PENDING" | "PROCESSING";

export type {
  AvatarAnalyzePayload,
  AvatarGeneratePayload,
  AvatarVariationGeneratePayload,
  JobPayloadMap,
  JobType,
  PostCaptionGeneratePayload,
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
        status: { in: ["PENDING", "PROCESSING"] satisfies ActiveJobStatus[] },
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

export function enqueueAvatarGenerateJob(payload: AvatarGeneratePayload) {
  return enqueueJob("avatar.generate", payload);
}

export function enqueueAvatarVariationGenerateJob(payload: AvatarVariationGeneratePayload) {
  return enqueueJob("avatar.variation.generate", payload);
}

export function enqueueAvatarAnalyzeJob(payload: AvatarAnalyzePayload) {
  return enqueueJob("avatar.analyze", payload);
}

export function enqueuePostMetadataJob(payload: PostMetadataGeneratePayload) {
  return enqueueJob("post.metadata", payload);
}

export function enqueuePostCaptionGenerateJob(payload: PostCaptionGeneratePayload) {
  return enqueueJob("post.caption.generate", payload);
}

export function enqueuePostGenerateJob(payload: PostGeneratePayload) {
  return enqueueJob("post.generate", payload);
}
