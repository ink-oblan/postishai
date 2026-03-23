import fs from "fs/promises";
import path from "path";

function storageRoot(): string {
  return path.resolve(process.cwd(), process.env.STORAGE_PATH ?? "./storage");
}

export function storagePath(relativePath: string): string {
  return path.join(storageRoot(), relativePath);
}

export async function writeFile(relativePath: string, data: Buffer): Promise<void> {
  const fullPath = storagePath(relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
}

export async function readFile(relativePath: string): Promise<Buffer> {
  return fs.readFile(storagePath(relativePath));
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath(relativePath));
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(storagePath(relativePath));
    return true;
  } catch {
    return false;
  }
}
