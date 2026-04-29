import { prisma } from "@/lib/db";
import { getImageAdapter } from "@/lib/image-models/registry";
import { archiveFile, writeFile } from "@/lib/storage";
import type { AvatarGeneratePayload } from "../jobs";

const log = (...args: unknown[]) =>
  console.log(`[${new Date().toISOString()}] [avatar-generate]`, ...args);
const logError = (...args: unknown[]) =>
  console.error(`[${new Date().toISOString()}] [avatar-generate]`, ...args);

export async function handleAvatarGenerate(payload: AvatarGeneratePayload): Promise<void> {
  const { avatarId, prompt, imageModel } = payload;
  log(`start avatarId=${avatarId} model=${imageModel}`);
  log(`prompt: ${prompt.split("\n")[0]}`); // first line only

  const adapter = getImageAdapter(imageModel);

  log(`calling ${imageModel} API...`);
  let result: Awaited<ReturnType<typeof adapter.generate>>;
  try {
    result = await adapter.generate({ prompt, aspectRatio: "9:16" });
    log(`API returned mimeType=${result.mimeType} base64Length=${result.base64.length}`);
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
    logError(`API call failed: ${detail}`);
    throw err;
  }

  const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
  const relativePath = `avatars/${avatarId}.${ext}`;

  log(`backing up old image...`);
  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (avatar?.imagePath && avatar.imagePath !== "") {
    await archiveFile(avatar.imagePath).catch(() => null);
  }

  log(`writing image to ${relativePath}...`);
  await writeFile(relativePath, Buffer.from(result.base64, "base64"));

  log(`updating avatar status to COMPLETED`);
  await prisma.avatar.update({
    where: { id: avatarId },
    data: { imagePath: relativePath, status: "COMPLETED", errorMessage: null },
  });

  log(`done avatarId=${avatarId}`);
}
