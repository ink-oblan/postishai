import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile as writeFileFs } from "node:fs/promises";
import { broadcastPostStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { runFfmpeg, runFfprobe } from "@/lib/ffmpeg";
import { convertToJpeg } from "@/lib/image-convert";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import type { LLMModelAdapter } from "@/lib/llm-models/types";
import { renderPromptTemplate } from "@/lib/prompts";
import { readFile as readFileStorage } from "@/lib/storage";
import { PLATFORM_FULL_NAMES } from "@/lib/utils";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition, PostCaptionGeneratePayload } from "@/workers/types";

const VIDEO_FRAME_COUNT = 10;

type PostCaptionGenerateResult = {
  caption: string;
};

class UserInputError extends Error {}

async function getVideoDurationSeconds(path: string): Promise<number> {
  const stdout = await runFfprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  const duration = Number.parseFloat(stdout);
  if (Number.isNaN(duration) || duration <= 0) {
    throw new UserInputError("The video file is unreadable or has no valid duration.");
  }
  return duration;
}

async function hasAudioStream(path: string): Promise<boolean> {
  const stdout = await runFfprobe([
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=index",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  return stdout.length > 0;
}

interface VideoMedia {
  frames: { mimeType: string; base64: string }[];
  audio: { mimeType: string; base64: string } | null;
}

async function extractVideoMedia(buffer: Buffer): Promise<VideoMedia> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/caption_in_${id}.mp4`;
  const tmpPat = `/tmp/caption_out_${id}_%03d.jpg`;
  const tmpOuts = Array.from(
    { length: VIDEO_FRAME_COUNT },
    (_, i) => `/tmp/caption_out_${id}_${String(i + 1).padStart(3, "0")}.jpg`,
  );
  const tmpAudio = `/tmp/caption_audio_${id}.mp3`;

  try {
    await writeFileFs(tmpIn, buffer);

    const duration = await getVideoDurationSeconds(tmpIn);

    const step = duration / VIDEO_FRAME_COUNT;
    const selectExpr = `isnan(prev_selected_t)+gte(t-prev_selected_t\\,${step.toFixed(6)})`;
    await runFfmpeg([
      "-i",
      tmpIn,
      "-vf",
      `select='${selectExpr}'`,
      "-vsync",
      "vfr",
      "-frames:v",
      String(VIDEO_FRAME_COUNT),
      "-y",
      tmpPat,
    ]);

    const frames = await Promise.all(
      tmpOuts.map(async (p) => {
        const frame = await readFile(p);
        await unlink(p).catch(() => {});
        return { mimeType: "image/jpeg", base64: frame.toString("base64") };
      }),
    );

    let audio: { mimeType: string; base64: string } | null = null;
    if (await hasAudioStream(tmpIn)) {
      await runFfmpeg(["-i", tmpIn, "-vn", "-acodec", "libmp3lame", "-y", tmpAudio]);
      const audioBuffer = await readFile(tmpAudio);
      audio = { mimeType: "audio/mp3", base64: audioBuffer.toString("base64") };
      await unlink(tmpAudio).catch(() => {});
    }

    return { frames, audio };
  } finally {
    await Promise.all([
      unlink(tmpIn).catch(() => {}),
      unlink(tmpAudio).catch(() => {}),
      ...tmpOuts.map((p) => unlink(p).catch(() => {})),
    ]);
  }
}

async function describeMedia(
  adapter: LLMModelAdapter,
  media: Buffer[],
  isVideo: boolean[],
): Promise<string[]> {
  const descriptions: string[] = [];

  for (let i = 0; i < media.length; i++) {
    const buffer = media[i];
    const isVideoFile = isVideo[i];

    if (isVideoFile) {
      const { frames, audio } = await extractVideoMedia(buffer);
      const videoDescriptionPrompt = await renderPromptTemplate(
        "describe-video-frames-prompt.txt",
        { frameCount: frames.length, hasAudio: audio !== null },
      );
      descriptions.push(
        await adapter.describeImages(videoDescriptionPrompt, frames, audio ?? undefined),
      );
    } else {
      const jpeg = await convertToJpeg(buffer);
      const imageDescriptionPrompt = await renderPromptTemplate("describe-media-prompt.txt");
      descriptions.push(
        await adapter.describeImage(imageDescriptionPrompt, jpeg.toString("base64"), "image/jpeg"),
      );
    }
  }
  return descriptions;
}

export const postCaptionGenerateJob: JobDefinition<
  "post.caption.generate",
  PostCaptionGenerateResult
> = {
  type: "post.caption.generate",
  timeoutMs: 15 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ postId }) => `post.caption.generate:${postId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      postId: readRequiredString(payload, "postId"),
    } satisfies PostCaptionGeneratePayload;
  },
  async onEnqueue(db, payload) {
    console.log(
      `[post.caption.generate] onEnqueue: setting status to GENERATING for postId=${payload.postId}`,
    );
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "GENERATING",
        errorMessage: null,
      },
    });
    console.log(`[post.caption.generate] onEnqueue: status updated for postId=${payload.postId}`);
  },
  async onStart(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "GENERATING",
        errorMessage: null,
      },
    });
  },
  async run(ctx, payload) {
    ctx.log(`[post.caption.generate] start postId=${payload.postId}`);

    const post = await ctx.db.post.findUnique({
      where: { id: payload.postId },
      include: { media: { orderBy: { order: "asc" } } },
    });

    if (!post) {
      throw new Error(`Post ${payload.postId} not found`);
    }

    if (post.media.length === 0) {
      throw new Error(`Post ${payload.postId} has no media files`);
    }

    if (!post.llmModelId) {
      throw new Error(`Post ${payload.postId} has no LLM model specified`);
    }

    // Read media files from storage
    const mediaBuffers: Buffer[] = [];
    const isVideoArray: boolean[] = [];

    for (const mediaFile of post.media) {
      ctx.log(`[post.caption.generate] reading media file: ${mediaFile.path}`);
      try {
        const buffer = await readFileStorage(mediaFile.path);
        ctx.log(`[post.caption.generate] read ${buffer.length} bytes from ${mediaFile.path}`);
        mediaBuffers.push(buffer);
        isVideoArray.push(mediaFile.type === "VIDEO");
      } catch (err) {
        ctx.logError(`[post.caption.generate] failed to read ${mediaFile.path}:`, err);
        throw err;
      }
    }

    const platform = PLATFORM_FULL_NAMES[post.platform] ?? "short-form video";

    // Get media descriptions
    const adapter = getLLMAdapter(post.llmModelId);
    ctx.log(`[post.caption.generate] describing ${mediaBuffers.length} media files`);
    const visualDescriptions = await describeMedia(adapter, mediaBuffers, isVideoArray);
    ctx.log(`[post.caption.generate] got ${visualDescriptions.length} descriptions`);

    const prompt = await renderPromptTemplate("caption-generate-prompt.txt", {
      platformLabel: platform,
      topic: post.title?.trim(),
      details: post.details?.trim(),
      visualDescriptions: visualDescriptions.map((d) => d.trim()),
    });

    ctx.log(`[post.caption.generate] generating caption with prompt length ${prompt.length}`);
    const caption = await adapter.generate(prompt);
    ctx.log(`[post.caption.generate] generated caption: ${caption.substring(0, 100)}...`);

    return {
      caption: caption.trim(),
    };
  },
  async onSuccess(db, payload, result) {
    const post = await db.post.update({
      where: { id: payload.postId },
      data: {
        status: "COMPLETED",
        caption: result.caption,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
    if (post.userId) {
      broadcastPostStatusUpdate(post.userId, payload.postId, "COMPLETED");
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
      .catch(() => null);
    if (post?.userId) {
      broadcastPostStatusUpdate(post.userId, payload.postId, "FAILED");
    }
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
