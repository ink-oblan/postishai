import { afterEach, describe, expect, it, vi } from "vitest";

const { assertStorageModeInitializedMock } = vi.hoisted(() => ({
  assertStorageModeInitializedMock: vi.fn(),
}));

vi.mock("../lib/platform-config", () => ({
  assertStorageModeInitialized: assertStorageModeInitializedMock,
}));

describe("instrumentation register", () => {
  afterEach(() => {
    assertStorageModeInitializedMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("initializes storage mode for the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const { register } = await import("../instrumentation");

    await register();

    expect(assertStorageModeInitializedMock).toHaveBeenCalledOnce();
  });

  it("skips non-Node runtimes", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const { register } = await import("../instrumentation");

    await register();

    expect(assertStorageModeInitializedMock).not.toHaveBeenCalled();
  });
});
