import "dotenv/config";
import { hostname } from "node:os";
import type { Job } from "@prisma/client";
import { JOB_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { assertStorageModeInitialized } from "@/lib/platform-config";
import { removeWorkerHeartbeat, updateWorkerHeartbeat } from "@/workers/health";
import { jobRegistry } from "@/workers/registry";
import type { JobDefinition, JobType } from "@/workers/types";

const POLL_INTERVAL_MS = 3000;
const RECOVERY_BUFFER_MS = 30_000;
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000];
const HEALTHCHECK_INTERVAL_MS = 5000;
const NO_JOBS_LOG_INTERVAL_MS = 10_000;
const workerId = `${hostname()}:${process.pid}`;

let shuttingDown = false;
let currentJobPromise: Promise<void> | null = null;
let currentJobId: string | null = null;
let lastNoJobsLogAt = 0;

function shouldLogNoJobs(): boolean {
  return Date.now() - lastNoJobsLogAt >= NO_JOBS_LOG_INTERVAL_MS;
}

const log = (...args: unknown[]) => console.log(`[${new Date().toISOString()}] [worker]`, ...args);
const logError = (...args: unknown[]) =>
  console.error(`[${new Date().toISOString()}] [worker]`, ...args);

process.on("uncaughtException", (error) => logError("uncaughtException:", error));
process.on("unhandledRejection", (reason) => logError("unhandledRejection:", reason));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

function getJobDefinition(type: string): JobDefinition<JobType> {
  const definition = jobRegistry[type as JobType] as JobDefinition<JobType>;
  if (!definition) {
    throw new Error(`Unknown job type: ${type}`);
  }
  return definition;
}

function getRetryDelayMs(attempts: number): number {
  return RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
}

async function claimNextJob(): Promise<Job | null> {
  const pending = await prisma.job.findFirst({
    where: {
      status: JOB_STATUS.PENDING,
      runAfter: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!pending) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const claim = await tx.job.updateMany({
      where: {
        id: pending.id,
        status: JOB_STATUS.PENDING,
      },
      data: {
        status: JOB_STATUS.PROCESSING,
        attempts: { increment: 1 },
        lockedAt: new Date(),
        lockedBy: workerId,
        error: null,
      },
    });

    if (claim.count === 0) {
      return null;
    }

    return tx.job.findUnique({ where: { id: pending.id } });
  });
}

async function completeJob(
  job: Job,
  definition: JobDefinition,
  payload: unknown,
  result: unknown,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await definition.onSuccess?.(tx, payload as never, result as never, job);
    await tx.job.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.COMPLETED,
        error: null,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  });
}

async function failJob(
  job: Job,
  definition: JobDefinition,
  payload: unknown,
  error: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await definition.onFailure?.(tx, payload as never, error, job);
    await tx.job.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.FAILED,
        error,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  });
}

async function requeueJob(job: Job, error: string): Promise<void> {
  const nextRun = new Date(Date.now() + getRetryDelayMs(job.attempts));
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JOB_STATUS.PENDING,
      error,
      runAfter: nextRun,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function processJob(job: Job): Promise<void> {
  const definition = getJobDefinition(job.type);
  const payload = definition.parse(job.payload);
  currentJobId = job.id;

  log(`processing job ${job.id} type=${job.type} attempt=${job.attempts}/${job.maxAttempts}`);

  try {
    await prisma.$transaction(async (tx) => {
      await definition.onStart?.(tx, payload as never, job);
    });

    const result = await withTimeout(
      definition.run({ db: prisma, workerId, log, logError }, payload as never, job),
      definition.timeoutMs,
      `${job.type}(${job.id})`,
    );

    await completeJob(job, definition, payload, result);
    log(`job ${job.id} completed`);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    const retryable = definition.classifyError(cause) === "retryable";
    const exhausted = job.attempts >= job.maxAttempts;

    if (retryable && !exhausted) {
      await requeueJob(job, error);
      log(`job ${job.id} requeued (attempt ${job.attempts}/${job.maxAttempts}): ${error}`);
      return;
    }

    logError(
      `job ${job.id} failed permanently (attempt ${job.attempts}/${job.maxAttempts}): ${error}`,
    );
    await failJob(job, definition, payload, error);
  } finally {
    currentJobId = null;
  }
}

async function recoverInterruptedJobs(): Promise<void> {
  const stuckJobs = await prisma.job.findMany({
    where: { status: JOB_STATUS.PROCESSING },
    orderBy: { createdAt: "asc" },
  });

  if (stuckJobs.length === 0) {
    return;
  }

  for (const job of stuckJobs) {
    const definition = getJobDefinition(job.type);
    const staleMs = definition.timeoutMs + RECOVERY_BUFFER_MS;
    const lockedAt = job.lockedAt?.getTime() ?? 0;
    const ageMs = Date.now() - lockedAt;
    if (lockedAt > 0 && ageMs < staleMs) {
      log(
        `skipping job ${job.id} type=${job.type} — not yet stale (${Math.round(ageMs / 1000)}s / ${Math.round(staleMs / 1000)}s)`,
      );
      continue;
    }

    const error = "Worker restarted while job was in progress";
    const payload = definition.parse(job.payload);

    if (job.attempts < job.maxAttempts) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JOB_STATUS.PENDING,
          error,
          runAfter: new Date(Date.now() + getRetryDelayMs(job.attempts || 1)),
          lockedAt: null,
          lockedBy: null,
        },
      });
      log(`requeued interrupted job ${job.id} type=${job.type}`);
      continue;
    }

    await failJob(job, definition, payload, error);
    log(`failed interrupted job ${job.id} type=${job.type}`);
  }
}

async function drainAvailableJobs(): Promise<void> {
  let processed = 0;
  while (!shuttingDown) {
    const job = await claimNextJob();
    if (!job) {
      if (processed === 0 && shouldLogNoJobs()) {
        log("poll: no pending jobs");
        lastNoJobsLogAt = Date.now();
      }
      return;
    }

    currentJobPromise = processJob(job);
    await currentJobPromise;
    currentJobPromise = null;
    processed++;
  }
}

export async function runWorker(): Promise<void> {
  await assertStorageModeInitialized();
  log(`started workerId=${workerId} polling every ${POLL_INTERVAL_MS}ms`);

  const heartbeat = async () => {
    try {
      await updateWorkerHeartbeat({ currentJobId, shuttingDown, workerId });
    } catch (error) {
      logError("heartbeat error:", error);
    }
  };

  const tick = async () => {
    try {
      await recoverInterruptedJobs();
      await drainAvailableJobs();
    } catch (error) {
      logError("tick error:", error);
    }
  };

  await heartbeat();
  await tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  const heartbeatInterval = setInterval(heartbeat, HEALTHCHECK_INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(interval);
    clearInterval(heartbeatInterval);
    shuttingDown = true;
    await heartbeat();
    log("shutting down...");
    if (currentJobPromise) {
      log("waiting for in-progress job to finish...");
      await currentJobPromise;
    }
    await removeWorkerHeartbeat();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
