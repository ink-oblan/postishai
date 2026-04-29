import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "./config";

let s3Client: S3Client | null = null;

function storageRoot(): string {
  const configuredPath = config.storagePath;
  if (path.isAbsolute(configuredPath)) return configuredPath;
  return path.join(/*turbopackIgnore: true*/ process.cwd(), configuredPath);
}

export function normalizeStoragePath(relativePath: string): string {
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    relativePath.includes("\0")
  ) {
    throw new Error(`Invalid storage path: ${relativePath}`);
  }

  const normalized = path.posix.normalize(relativePath.replaceAll("\\", "/"));
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`Invalid storage path: ${relativePath}`);
  }

  return normalized;
}

function s3Prefix(): string {
  const prefix = config.s3.prefix?.trim();
  if (!prefix) return "";
  return prefix.replace(/^\/+|\/+$/g, "");
}

export function storageObjectKey(relativePath: string): string {
  const normalizedPath = normalizeStoragePath(relativePath);
  const prefix = s3Prefix();
  return prefix ? `${prefix}/${normalizedPath}` : normalizedPath;
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
  return s3Client;
}

function s3Bucket(): string {
  return config.s3.bucket;
}

function isS3NotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  return name === "NotFound" || name === "NoSuchKey" || name === "404";
}

export function storagePath(relativePath: string): string {
  return path.join(storageRoot(), normalizeStoragePath(relativePath));
}

export async function writeFile(relativePath: string, data: Buffer): Promise<void> {
  if (config.storageMode === "s3") {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: storageObjectKey(relativePath),
        Body: data,
      }),
    );
    return;
  }

  const fullPath = storagePath(relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
}

export async function readFile(relativePath: string): Promise<Buffer> {
  if (config.storageMode === "s3") {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: storageObjectKey(relativePath),
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : Buffer.alloc(0);
  }

  return fs.readFile(storagePath(relativePath));
}

export async function deleteFile(relativePath: string): Promise<void> {
  if (config.storageMode === "s3") {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: s3Bucket(),
        Key: storageObjectKey(relativePath),
      }),
    );
    return;
  }

  try {
    await fs.unlink(storagePath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  if (config.storageMode === "s3") {
    try {
      await getS3Client().send(
        new HeadObjectCommand({
          Bucket: s3Bucket(),
          Key: storageObjectKey(relativePath),
        }),
      );
      return true;
    } catch (error) {
      if (isS3NotFound(error)) return false;
      throw error;
    }
  }

  try {
    await fs.access(storagePath(relativePath));
    return true;
  } catch {
    return false;
  }
}
