import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send = sendMock;
  }

  class PutObjectCommand {
    constructor(readonly input: unknown) {}
  }

  class GetObjectCommand {
    constructor(readonly input: unknown) {}
  }

  class DeleteObjectCommand {
    constructor(readonly input: unknown) {}
  }

  class HeadObjectCommand {
    constructor(readonly input: unknown) {}
  }

  class NotFound extends Error {
    constructor() {
      super("NotFound");
      this.name = "NotFound";
    }
  }

  return {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    NotFound,
    PutObjectCommand,
    S3Client,
  };
});

describe("storage path normalization", () => {
  it("normalizes relative paths", async () => {
    const { normalizeStoragePath, storageObjectKey } = await import("../storage");

    vi.stubEnv("S3_PREFIX", "postishai/storage/");

    expect(normalizeStoragePath("avatars/../videos/file.mp4")).toBe("videos/file.mp4");
    expect(storageObjectKey("videos/file.mp4")).toBe("postishai/storage/videos/file.mp4");
  });

  it.each([
    "/tmp/file.png",
    "../file.png",
    "avatars/../../file.png",
    "C:\\tmp\\file.png",
    "",
  ])("rejects unsafe path %j", async (unsafePath) => {
    const { normalizeStoragePath } = await import("../storage");

    expect(() => normalizeStoragePath(unsafePath)).toThrow("Invalid storage path");
  });
});

describe("local storage", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "postishai-storage-"));
    vi.stubEnv("USE_S3_AS_STORAGE", "");
    vi.stubEnv("STORAGE_PATH", tempDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(tempDir, { force: true, recursive: true });
  });

  it("writes, reads, checks, and deletes files", async () => {
    const { deleteFile, fileExists, readFile, storagePath, writeFile } = await import("../storage");

    await writeFile("avatars/a.png", Buffer.from("image"));

    expect(storagePath("avatars/a.png")).toBe(path.join(tempDir, "avatars/a.png"));
    await expect(readFile("avatars/a.png")).resolves.toEqual(Buffer.from("image"));
    await expect(fileExists("avatars/a.png")).resolves.toBe(true);

    await deleteFile("avatars/a.png");

    await expect(fileExists("avatars/a.png")).resolves.toBe(false);
  });
});

describe("s3 storage", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubEnv("USE_S3_AS_STORAGE", "true");
    vi.stubEnv("S3_BUCKET", "media-bucket");
    vi.stubEnv("S3_PREFIX", "postishai/storage");
    vi.stubEnv("AWS_REGION", "us-east-1");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "access");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("puts objects under the configured prefix", async () => {
    const { writeFile } = await import("../storage");

    await writeFile("avatars/a.png", Buffer.from("image"));

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0].input).toMatchObject({
      Body: Buffer.from("image"),
      Bucket: "media-bucket",
      Key: "postishai/storage/avatars/a.png",
    });
  });

  it("gets objects as buffers", async () => {
    sendMock.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => new Uint8Array(Buffer.from("video")),
      },
    });
    const { readFile } = await import("../storage");

    await expect(readFile("videos/a.mp4")).resolves.toEqual(Buffer.from("video"));
    expect(sendMock.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: "media-bucket",
      Key: "postishai/storage/videos/a.mp4",
    });
  });

  it("deletes objects", async () => {
    const { deleteFile } = await import("../storage");

    await deleteFile("avatars/a.png");

    expect(sendMock.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: "media-bucket",
      Key: "postishai/storage/avatars/a.png",
    });
  });

  it("checks object existence", async () => {
    const { fileExists } = await import("../storage");

    await expect(fileExists("avatars/a.png")).resolves.toBe(true);

    const missing = new Error("NotFound");
    missing.name = "NotFound";
    sendMock.mockRejectedValueOnce(missing);
    await expect(fileExists("avatars/missing.png")).resolves.toBe(false);
  });
});
