import { prisma } from "@/lib/db";
import { writeFile, readFile } from "@/lib/storage";
import { uploadAvatarImage, createVideo, getVideoStatus, downloadVideo } from "@/lib/heygen/client";
import type { PostGeneratePayload } from "../jobs";
import { spawn } from "child_process";
import { writeFile as writeFileFs, readFile as readFileFs, unlink } from "fs/promises";
import { randomBytes } from "crypto";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const log = (...args: unknown[]) =>
  console.log(`[${new Date().toISOString()}] [post-generate]`, ...args);
const logError = (...args: unknown[]) =>
  console.error(`[${new Date().toISOString()}] [post-generate]`, ...args);

export async function handlePostGenerate(payload: PostGeneratePayload): Promise<void> {
  const { postId } = payload;
  log(`start postId=${postId}`);

  const post = await prisma.post.findUnique({ where: { id: postId }, include: { avatar: true } });
  if (!post) throw new Error(`Post ${postId} not found`);

  // Step 1: Upload avatar image to HeyGen (cached)
  const avatar = post.avatar;
  let heygenAssetId = avatar.heygenAssetId;
  if (!heygenAssetId) {
    log(`uploading avatar image to HeyGen...`);
    try {
      const imageBuffer = await readFile(avatar.imagePath);
      const mimeType = avatar.imagePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
      const { assetId, assetUrl } = await uploadAvatarImage(imageBuffer, mimeType);
      heygenAssetId = assetId;
      await prisma.avatar.update({
        where: { id: avatar.id },
        data: { heygenAssetId: assetId, heygenAssetUrl: assetUrl },
      });
      log(`avatar uploaded assetId=${assetId}`);
    } catch (err) {
      logError(`avatar upload failed:`, err instanceof Error ? err.message : err);
      throw err;
    }
  } else {
    log(`using cached heygenAssetId=${heygenAssetId}`);
  }

  // Step 2: Submit HeyGen video job
  log(`submitting HeyGen video job...`);
  let heygenVideoId: string;
  try {
    heygenVideoId = await createVideo({
      image_asset_id: heygenAssetId,
      script: post.script,
      voice_id: post.avatar.voiceId,
      title: post.title,
      aspect_ratio: "9:16",
      resolution: "1080p",
    });
    await prisma.post.update({
      where: { id: postId },
      data: { status: "GENERATING", heygenVideoId, errorMessage: null },
    });
    log(`HeyGen job submitted videoId=${heygenVideoId}`);
  } catch (err) {
    logError(`HeyGen submit failed:`, err instanceof Error ? err.message : err);
    throw err;
  }

  // Step 3: Poll HeyGen until completed or failed
  log(`polling HeyGen status...`);
  const pollStart = Date.now();
  while (true) {
    if (Date.now() - pollStart > POLL_TIMEOUT_MS) {
      throw new Error(`HeyGen polling timed out after ${POLL_TIMEOUT_MS / 1000}s`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let data: Awaited<ReturnType<typeof getVideoStatus>>;
    try {
      data = await getVideoStatus(heygenVideoId);
    } catch (err) {
      logError(`HeyGen status poll failed (will retry):`, err instanceof Error ? err.message : err);
      continue;
    }

    log(`HeyGen status=${data.status}`);

    if (data.status === "completed" && data.video_url) {
      log(`downloading video...`);
      const rawBuffer = await downloadVideo(data.video_url);
      log(`removing HeyGen edge pillars...`);
      const videoBuffer = await removeEdgePillars(rawBuffer);
      const videoPath = `videos/${postId}.mp4`;
      await writeFile(videoPath, videoBuffer);

      await prisma.post.update({
        where: { id: postId },
        data: { status: "COMPLETED", videoPath, heygenVideoUrl: data.video_url, errorMessage: null },
      });
      log(`done postId=${postId}`);
      return;
    }

    if (data.status === "failed") {
      throw new Error(`HeyGen reported failure: ${data.error ?? "unknown"}`);
    }
  }
}

// HeyGen bakes ~4px near-white border pillars on left/right edges.
// Mirror-fill them with adjacent valid content pixels to keep 1080x1920.
// Uses h264_nvenc (NVIDIA GPU). For CPU-only servers, replace encoder flags with:
//   -c:v libx264 -preset ultrafast -crf 23
async function removeEdgePillars(input: Buffer): Promise<Buffer> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/hg_in_${id}.mp4`;
  const tmpOut = `/tmp/hg_out_${id}.mp4`;
  try {
    await writeFileFs(tmpIn, input);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", [
        "-i", tmpIn,
        "-vf", "split=3[a][b][c];[a]crop=4:ih:4:0[lf];[b]crop=1072:ih:4:0[mid];[c]crop=4:ih:1072:0[rf];[lf][mid][rf]hstack=inputs=3",
        "-c:v", "h264_nvenc", "-preset", "p1", "-cq", "28",
        "-c:a", "copy",
        "-y", tmpOut,
      ]);
      proc.stderr.on("data", () => {});
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))
      );
    });
    return await readFileFs(tmpOut);
  } finally {
    await Promise.all([unlink(tmpIn).catch(() => {}), unlink(tmpOut).catch(() => {})]);
  }
}
