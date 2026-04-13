import "dotenv/config";
import { prisma } from "./lib/db";
import { handleAvatarGenerate } from "./lib/worker/handlers/avatar-generate";
import { handlePostMetadataGenerate } from "./lib/worker/handlers/post-metadata-generate";
import { handlePostGenerate } from "./lib/worker/handlers/post-generate";
import type {
  AvatarGeneratePayload,
  PostGeneratePayload,
  PostMetadataGeneratePayload,
} from "./lib/worker/jobs";

const POLL_INTERVAL_MS = 3000;
const JOB_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes
const MAX_ATTEMPTS = 1; // set > 1 to enable retries

const log = (...args: unknown[]) =>
  console.log(`[${new Date().toISOString()}] [worker]`, ...args);
const logError = (...args: unknown[]) =>
  console.error(`[${new Date().toISOString()}] [worker]`, ...args);

// Never let the process die silently
process.on("uncaughtException", (err) => logError("uncaughtException:", err));
process.on("unhandledRejection", (reason) => logError("unhandledRejection:", reason));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

async function processNextJob(): Promise<boolean> {
  const pending = await prisma.job.findFirst({
    where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
  });
  if (!pending) return false;

  let job;
  try {
    job = await prisma.job.update({
      where: { id: pending.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
  } catch (err) {
    logError(`failed to claim job ${pending.id} (DB locked?), will retry next tick:`, err instanceof Error ? err.message : err);
    return false;
  }

  log(`processing job ${job.id} type=${job.type} attempt=${job.attempts}`);

  try {
    const payload = JSON.parse(job.payload);
    if (job.type === "avatar.generate") {
      await withTimeout(
        handleAvatarGenerate(payload as AvatarGeneratePayload),
        JOB_TIMEOUT_MS,
        `avatar.generate(${(payload as AvatarGeneratePayload).avatarId})`
      );
    } else if (job.type === "post.metadata") {
      await withTimeout(
        handlePostMetadataGenerate(payload as PostMetadataGeneratePayload),
        JOB_TIMEOUT_MS,
        `post.metadata(${(payload as PostMetadataGeneratePayload).postId})`
      );
    } else if (job.type === "post.generate") {
      await withTimeout(
        handlePostGenerate(payload as PostGeneratePayload),
        JOB_TIMEOUT_MS,
        `post.generate(${(payload as PostGeneratePayload).postId})`
      );
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
    log(`job ${job.id} completed`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logError(`job ${job.id} failed:`, error);

    const isExhausted = job.attempts >= MAX_ATTEMPTS;
    await prisma.job.update({
      where: { id: job.id },
      data: { status: isExhausted ? "FAILED" : "PENDING", error },
    }).catch((e) => logError("failed to update job status:", e));

    if (isExhausted && job.type === "avatar.generate") {
      const payload = JSON.parse(job.payload) as AvatarGeneratePayload;
      await prisma.avatar.update({
        where: { id: payload.avatarId },
        data: { status: "FAILED", errorMessage: error },
      }).catch((e) => logError("failed to update avatar status:", e));
    } else if (isExhausted && job.type === "post.metadata") {
      const payload = JSON.parse(job.payload) as PostMetadataGeneratePayload;
      await failPostMetadataJob(payload.postId, error);
    } else if (isExhausted && job.type === "post.generate") {
      const payload = JSON.parse(job.payload) as PostGeneratePayload;
      await prisma.post.update({
        where: { id: payload.postId },
        data: { status: "FAILED", errorMessage: error },
      }).catch((e) => logError("failed to update post status:", e));
    }
  }

  return true;
}

// On startup, any job still in PROCESSING was interrupted by a previous crash/restart.
// Mark them FAILED immediately (they will not be retried per MAX_ATTEMPTS policy).
async function recoverInterruptedJobs(): Promise<void> {
  const stuck = await prisma.job.findMany({ where: { status: "PROCESSING" } });
  if (stuck.length === 0) return;
  log(`recovering ${stuck.length} interrupted job(s)...`);
  for (const job of stuck) {
    const error = "Worker restarted while job was in progress";
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", error },
    }).catch((e) => logError("failed to recover job:", e));

    if (job.type === "avatar.generate") {
      const payload = JSON.parse(job.payload) as AvatarGeneratePayload;
      await prisma.avatar.update({
        where: { id: payload.avatarId },
        data: { status: "FAILED", errorMessage: error },
      }).catch((e) => logError("failed to update avatar on recovery:", e));
    } else if (job.type === "post.metadata") {
      const payload = JSON.parse(job.payload) as PostMetadataGeneratePayload;
      await failPostMetadataJob(payload.postId, error);
    } else if (job.type === "post.generate") {
      const payload = JSON.parse(job.payload) as PostGeneratePayload;
      await prisma.post.update({
        where: { id: payload.postId },
        data: { status: "FAILED", errorMessage: error },
      }).catch((e) => logError("failed to update post on recovery:", e));
    }
    log(`job ${job.id} marked FAILED (interrupted)`);
  }
}

async function failPostMetadataJob(postId: string, error: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { status: true, videoPath: true },
  });
  if (!post) return;

  const shouldFailPost = !post.videoPath && (post.status === "DRAFT" || post.status === "FAILED");
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: shouldFailPost ? "FAILED" : post.status,
      errorMessage: error,
    },
  }).catch((e) => logError("failed to update post metadata status:", e));
}

async function runWorker(): Promise<void> {
  log(`started, polling every ${POLL_INTERVAL_MS}ms, job timeout ${JOB_TIMEOUT_MS / 1000}s`);
  await recoverInterruptedJobs();

  const tick = async () => {
    try {
      let hadJob = true;
      while (hadJob) {
        hadJob = await processNextJob();
      }
    } catch (err) {
      logError("tick error:", err);
    }
  };

  await tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);

  const shutdown = async () => {
    log("shutting down...");
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

runWorker();
