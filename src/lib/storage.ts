import fs from "node:fs/promises";
import path from "node:path";
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

function archivePrefix(): string {
  return normalizeStoragePath(config.storageArchivePrefix.trim().replace(/^\/+|\/+$/g, ""));
}

export function storageObjectKey(relativePath: string): string {
  const normalizedPath = normalizeStoragePath(relativePath);
  const prefix = s3Prefix();
  return prefix ? `${prefix}/${normalizedPath}` : normalizedPath;
}

export function storageArchivePath(relativePath: string, now = new Date()): string {
  const normalizedPath = normalizeStoragePath(relativePath);
  const parsed = path.posix.parse(normalizedPath);
  const timestamp = now.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const fileName = `${parsed.name}.${timestamp}${parsed.ext}`;
  const archiveDir = parsed.dir ? `${archivePrefix()}/${parsed.dir}` : archivePrefix();
  return `${archiveDir}/${fileName}`;
}

function copySource(bucket: string, key: string): string {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
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

export async function archiveFile(relativePath: string): Promise<string | null> {
  const archivePath = storageArchivePath(relativePath);

  if (config.storageMode === "s3") {
    try {
      const bucket = s3Bucket();
      await getS3Client().send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: copySource(bucket, storageObjectKey(relativePath)),
          Key: storageObjectKey(archivePath),
        }),
      );
      return archivePath;
    } catch (error) {
      if (isS3NotFound(error)) return null;
      throw error;
    }
  }

  try {
    await fs.mkdir(path.dirname(storagePath(archivePath)), { recursive: true });
    await fs.copyFile(storagePath(relativePath), storagePath(archivePath));
    return archivePath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
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

export async function getPresignedUrl(relativePath: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: s3Bucket(),
      Key: storageObjectKey(relativePath),
    }),
    { expiresIn },
  );
}
