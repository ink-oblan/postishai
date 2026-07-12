import { randomBytes } from "node:crypto";
import { readFile as readFileFs, unlink, writeFile as writeFileFs } from "node:fs/promises";
import { broadcastPostStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { runFfmpeg } from "@/lib/ffmpeg";
import { createVideo, downloadVideo, getVideoStatus, uploadAvatarImage } from "@/lib/heygen/client";
import { isMockEnabled, MOCK_TIMINGS } from "@/lib/mock-config";
import { generateMockVideo } from "@/lib/mock-generators";
import { POLLING } from "@/lib/polling-config";
import { readFile, writeFile } from "@/lib/storage";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition, PostGeneratePayload } from "@/workers/types";

const HEYGEN_POLL_INTERVAL_MS = POLLING.HEYGEN_STATUS;
const HEYGEN_POLL_TIMEOUT_MS = 10 * 60 * 1000;

type PostGenerateResult = {
  videoPath: string;
  heygenVideoUrl: string;
};

export const postGenerateJob: JobDefinition<"post.generate", PostGenerateResult> = {
  type: "post.generate",
  timeoutMs: 15 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ postId }) => `post.generate:${postId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      postId: readRequiredString(payload, "postId"),
    } satisfies PostGeneratePayload;
  },
  async onEnqueue(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "GENERATING",
        errorMessage: null,
        generationStartedAt: new Date(),
      },
    });
  },
  async onStart(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "GENERATING",
        errorMessage: null,
        generationStartedAt: new Date(),
      },
    });
  },
  async run(ctx, payload) {
    ctx.log(`[post.generate] start postId=${payload.postId}`);

    if (isMockEnabled()) {
      // Mock mode: simulate video generation
      ctx.log(`[post.generate] MOCK MODE: waiting ${MOCK_TIMINGS.POST_VIDEO}ms`);
      await new Promise((resolve) => setTimeout(resolve, MOCK_TIMINGS.POST_VIDEO));
      const buffer = await generateMockVideo();
      const videoPath = `videos/${payload.postId}.mp4`;
      await writeFile(videoPath, buffer);
      ctx.log(`[post.generate] MOCK MODE: generated placeholder video`);

      return {
        videoPath,
        heygenVideoUrl: `mock://video/${payload.postId}`,
      };
    }

    // Real generation with HeyGen
    const post = await ctx.db.post.findUnique({
      where: { id: payload.postId },
      include: { avatar: true, avatarVariation: true },
    });
    if (!post) {
      throw new Error(`Post ${payload.postId} not found`);
    }
    if (!post.avatar || post.script === null) {
      throw new Error(`Post ${payload.postId} is missing avatar or script`);
    }

    let heygenVideoId = post.heygenVideoId;

    if (heygenVideoId) {
      ctx.log(`[post.generate] resuming HeyGen videoId=${heygenVideoId} postId=${payload.postId}`);
      await ctx.db.post.update({
        where: { id: payload.postId },
        data: { errorMessage: null },
      });
    } else {
      const variation = post.avatarVariation?.status === "COMPLETED" ? post.avatarVariation : null;
      let heygenAssetId = variation ? variation.heygenAssetId : post.avatar.heygenAssetId;

      if (!heygenAssetId) {
        const imagePath = variation ? variation.imagePath : post.avatar.imagePath;
        const imageBuffer = await readFile(imagePath);
        const uploaded = await uploadAvatarImage(imageBuffer, "image/jpeg");
        heygenAssetId = uploaded.assetId;
        if (variation) {
          await ctx.db.avatarVariation.update({
            where: { id: variation.id },
            data: { heygenAssetId: uploaded.assetId, heygenAssetUrl: uploaded.assetUrl },
          });
        } else {
          await ctx.db.avatar.update({
            where: { id: post.avatar.id },
            data: { heygenAssetId: uploaded.assetId, heygenAssetUrl: uploaded.assetUrl },
          });
        }
      }

      heygenVideoId = await createVideo({
        image_asset_id: heygenAssetId,
        script: post.script,
        voice_id: post.avatar.voiceId,
        title: post.title,
        aspect_ratio: "9:16",
        resolution: "1080p",
      });

      await ctx.db.post.update({
        where: { id: payload.postId },
        data: { heygenVideoId, errorMessage: null },
      });
    }

    const pollStart = Date.now();
    while (Date.now() - pollStart <= HEYGEN_POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, HEYGEN_POLL_INTERVAL_MS));

      const status = await getVideoStatus(heygenVideoId);
      ctx.log(`[post.generate] HeyGen status=${status.status} postId=${payload.postId}`);

      if (status.status === "completed" && status.video_url) {
        const rawBuffer = await downloadVideo(status.video_url);
        const cleanedBuffer = await removeEdgePillars(rawBuffer);
        const videoPath = `videos/${payload.postId}.mp4`;
        await writeFile(videoPath, cleanedBuffer);

        return {
          videoPath,
          heygenVideoUrl: status.video_url,
        };
      }

      if (status.status === "failed") {
        const detail =
          typeof status.error === "string" ? status.error : JSON.stringify(status.error);
        throw new Error(`HeyGen reported failure: ${detail ?? "unknown"}`);
      }
    }

    throw new Error(`HeyGen polling timed out after ${HEYGEN_POLL_TIMEOUT_MS / 1000}s`);
  },
  async onSuccess(db, payload, result) {
    const post = await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "COMPLETED",
        videoPath: result.videoPath,
        heygenVideoUrl: result.heygenVideoUrl,
        errorMessage: null,
      },
    });
    if (post.userId) {
      const userId = post.userId;
      await broadcastWithContext("post-generate-success", () =>
        broadcastPostStatusUpdate(userId, payload.postId, "COMPLETED"),
      );
    }
  },
  async onFailure(db, payload, error) {
    const post = await db.post
      .update({
        where: { id: payload.postId },
        data: {
          status: "FAILED",
          errorMessage: error,
        },
      })
      .catch((dbErr) => {
        console.error(
          `[post-generate-failure] DB update failed for postId=${payload.postId}:`,
          dbErr,
        );
        return null;
      });
    if (post?.userId) {
      const userId = post.userId;
      await broadcastWithContext("post-generate-failure", () =>
        broadcastPostStatusUpdate(userId, payload.postId, "FAILED"),
      );
    }
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};

async function removeEdgePillars(input: Buffer): Promise<Buffer> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/hg_in_${id}.mp4`;
  const tmpOut = `/tmp/hg_out_${id}.mp4`;

  try {
    await writeFileFs(tmpIn, input);

    try {
      await runFfmpeg([
        "-i",
        tmpIn,
        "-vf",
        "split=3[a][b][c];[a]crop=4:ih:4:0[lf];[b]crop=1072:ih:4:0[mid];[c]crop=4:ih:1072:0[rf];[lf][mid][rf]hstack=inputs=3",
        "-c:v",
        "h264_nvenc",
        "-preset",
        "p1",
        "-cq",
        "28",
        "-c:a",
        "copy",
        "-y",
        tmpOut,
      ]);
    } catch {
      await runFfmpeg([
        "-i",
        tmpIn,
        "-vf",
        "split=3[a][b][c];[a]crop=4:ih:4:0[lf];[b]crop=1072:ih:4:0[mid];[c]crop=4:ih:1072:0[rf];[lf][mid][rf]hstack=inputs=3",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-c:a",
        "copy",
        "-y",
        tmpOut,
      ]);
    }

    return await readFileFs(tmpOut);
  } finally {
    await Promise.all([unlink(tmpIn).catch(() => {}), unlink(tmpOut).catch(() => {})]);
  }
}
