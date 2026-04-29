import { describe, expect, it, vi } from "vitest";
import { assertStorageModeInitialized, storageModeMismatchMessage } from "../platform-config";

function delegateWithValue(value: string) {
  return {
    upsert: vi.fn(async () => ({
      key: "storage.mode",
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
}

describe("assertStorageModeInitialized", () => {
  it("creates the storage mode config when absent", async () => {
    const delegate = delegateWithValue("s3");

    await expect(assertStorageModeInitialized(delegate, "s3")).resolves.toBe("s3");

    expect(delegate.upsert).toHaveBeenCalledWith({
      where: { key: "storage.mode" },
      create: {
        key: "storage.mode",
        value: "s3",
      },
      update: {},
    });
  });

  it("accepts the existing matching storage mode", async () => {
    const delegate = delegateWithValue("local");

    await expect(assertStorageModeInitialized(delegate, "local")).resolves.toBe("local");

    expect(delegate.upsert).toHaveBeenCalledOnce();
  });

  it("refuses a storage mode mismatch", async () => {
    const delegate = delegateWithValue("local");

    await expect(assertStorageModeInitialized(delegate, "s3")).rejects.toThrow(
      storageModeMismatchMessage("local", "s3"),
    );
    expect(delegate.upsert).toHaveBeenCalledOnce();
  });
});
