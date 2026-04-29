import type { PlatformConfig } from "@prisma/client";
import { config } from "./config";
import { prisma } from "./db";
import type { StorageMode } from "./storage-mode";

const STORAGE_MODE_KEY = "storage.mode";

type PlatformConfigDelegate = {
  upsert(args: {
    where: { key: string };
    create: { key: string; value: StorageMode };
    update: Record<string, never>;
  }): Promise<PlatformConfig>;
};

export function storageModeMismatchMessage(currentMode: string, desiredMode: StorageMode): string {
  return [
    `Configured storage mode mismatch: database has "${currentMode}" but environment wants "${desiredMode}".`,
    "This app pins media storage on first startup to prevent local/S3 split-brain.",
    "Copy existing media to the desired backend and update PlatformConfig.storage.mode explicitly before changing USE_S3_AS_STORAGE.",
  ].join(" ");
}

export async function assertStorageModeInitialized(
  delegate: PlatformConfigDelegate = prisma.platformConfig,
  desiredMode = config.storageMode,
): Promise<StorageMode> {
  const existing = await delegate.upsert({
    where: { key: STORAGE_MODE_KEY },
    create: {
      key: STORAGE_MODE_KEY,
      value: desiredMode,
    },
    update: {},
  });

  if (existing.value !== desiredMode) {
    throw new Error(storageModeMismatchMessage(existing.value, desiredMode));
  }

  return desiredMode;
}
