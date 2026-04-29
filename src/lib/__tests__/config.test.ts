import { afterEach, describe, expect, it, vi } from "vitest";
import { config, isTruthyEnv } from "../config";

describe("config boolean env parsing", () => {
  it.each(["1", "true", "TRUE", "yes", "on", " On "])("treats %j as truthy", (value) => {
    expect(isTruthyEnv(value)).toBe(true);
  });

  it.each([undefined, "", "0", "false", "no", "off"])("treats %j as false", (value) => {
    expect(isTruthyEnv(value)).toBe(false);
  });
});

describe("config storage mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses s3 storage when USE_S3_AS_STORAGE is truthy", () => {
    vi.stubEnv("USE_S3_AS_STORAGE", "true");

    expect(config.storageMode).toBe("s3");
  });

  it("uses local storage when USE_S3_AS_STORAGE is not truthy", () => {
    vi.stubEnv("USE_S3_AS_STORAGE", "false");

    expect(config.storageMode).toBe("local");
  });

  it("uses a configurable storage archive prefix", () => {
    vi.stubEnv("STORAGE_ARCHIVE_PREFIX", "archives");

    expect(config.storageArchivePrefix).toBe("archives");
  });
});

describe("config s3 env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves s3 settings from environment variables", () => {
    vi.stubEnv("S3_BUCKET", "media-bucket");
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("S3_PREFIX", "postishai/storage");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "access");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");

    expect(config.s3.bucket).toBe("media-bucket");
    expect(config.s3.region).toBe("eu-central-1");
    expect(config.s3.prefix).toBe("postishai/storage");
    expect(config.s3.accessKeyId).toBe("access");
    expect(config.s3.secretAccessKey).toBe("secret");
  });

  it("requires aws region", () => {
    vi.stubEnv("AWS_REGION", "");

    expect(() => config.s3.region).toThrow("Missing required environment variable: AWS_REGION");
  });
});
