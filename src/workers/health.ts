import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "@/lib/config";

export async function updateWorkerHeartbeat(details: {
  currentJobId: string | null;
  shuttingDown: boolean;
  workerId: string;
}): Promise<void> {
  const healthPath = config.workerHealthPath;
  await mkdir(dirname(healthPath), { recursive: true });
  await writeFile(
    healthPath,
    JSON.stringify({
      ok: true,
      service: "worker",
      ...details,
      checkedAt: new Date().toISOString(),
    }),
    "utf8",
  );
}

export async function removeWorkerHeartbeat(): Promise<void> {
  await rm(config.workerHealthPath, { force: true });
}
