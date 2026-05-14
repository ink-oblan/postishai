import fs from "node:fs";
import { config } from "@/lib/config";

const maxAgeMs = Number(process.env.WORKER_HEALTH_MAX_AGE_MS || 15_000);

try {
  const ageMs = Date.now() - fs.statSync(config.workerHealthPath).mtimeMs;
  if (ageMs > maxAgeMs) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
