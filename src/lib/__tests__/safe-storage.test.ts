import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStorage, removeStorage, writeStorage } from "@/lib/safe-storage";

const KEY = "safe-storage-test";

function denyStorage(method: "getItem" | "setItem" | "removeItem") {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("safe-storage", () => {
  it("round-trips a value when storage is available", () => {
    expect(writeStorage(KEY, "stored")).toBe(true);
    expect(readStorage(KEY)).toBe("stored");

    removeStorage(KEY);
    expect(readStorage(KEY)).toBeNull();
  });

  it("reads as if nothing was stored when storage is denied", () => {
    denyStorage("getItem");
    expect(readStorage(KEY)).toBeNull();
  });

  it("drops a write when storage is denied", () => {
    denyStorage("setItem");
    expect(writeStorage(KEY, "stored")).toBe(false);
  });

  it("drops a removal when storage is denied", () => {
    denyStorage("removeItem");
    expect(() => removeStorage(KEY)).not.toThrow();
  });

  it("drops a write that exceeds the quota", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    expect(writeStorage(KEY, "stored")).toBe(false);
  });
});
