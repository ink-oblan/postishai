import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile as writeFileFs } from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { METADATA_STATUS, POST_STATUS } from "@/lib/constants";
import { debugLog } from "@/lib/debug";
import { runFfmpeg, runFfprobe } from "@/lib/ffmpeg";
import { convertToJpeg } from "@/lib/image-convert";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import type { LLMModelAdapter } from "@/lib/llm-models/types";
import { generateMetadata } from "@/lib/metadata/generator";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { isMockEnabled, MOCK_TIMINGS } from "@/lib/mock-config";
import { renderPromptTemplate } from "@/lib/prompts";
import { readFile as readFileStorage } from "@/lib/storage";
import { safeDbUpdate } from "@/workers/db-utils";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition, PostMetadataGeneratePayload } from "@/workers/types";

const VIDEO_FRAME_COUNT = 10;

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
    debugLog(
      `[post.metadata.generate] video duration=${duration.toFixed(2)}s, extracting ${VIDEO_FRAME_COUNT} frames`,
    );

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
    debugLog(`[post.metadata.generate] extracted ${frames.length} frames`);

    let audio: { mimeType: string; base64: string } | null = null;
    if (await hasAudioStream(tmpIn)) {
      debugLog(`[post.metadata.generate] audio stream found, extracting`);
      await runFfmpeg(["-i", tmpIn, "-vn", "-acodec", "libmp3lame", "-y", tmpAudio]);
      const audioBuffer = await readFile(tmpAudio);
      audio = { mimeType: "audio/mp3", base64: audioBuffer.toString("base64") };
      await unlink(tmpAudio).catch(() => {});
      debugLog(`[post.metadata.generate] audio extracted (${audioBuffer.length} bytes)`);
    } else {
      debugLog(`[post.metadata.generate] no audio stream in video`);
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
    debugLog(
      `[post.metadata.generate] describing media ${i + 1}/${media.length} (${isVideoFile ? "video" : "image"}, ${buffer.length} bytes)`,
    );

    if (isVideoFile) {
      const { frames, audio } = await extractVideoMedia(buffer);
      const videoDescriptionPrompt = await renderPromptTemplate(
        "describe-video-frames-prompt.txt",
        { frameCount: frames.length, hasAudio: audio !== null },
      );
      const description = await adapter.describeImages(
        videoDescriptionPrompt,
        frames,
        audio ?? undefined,
      );
      debugLog(
        `[post.metadata.generate] media ${i + 1} described (descriptionLength=${description.length})`,
      );
      descriptions.push(description);
    } else {
      const jpeg = await convertToJpeg(buffer);
      const imageDescriptionPrompt = await renderPromptTemplate("describe-media-prompt.txt");
      const description = await adapter.describeImage(
        imageDescriptionPrompt,
        jpeg.toString("base64"),
        "image/jpeg",
      );
      debugLog(
        `[post.metadata.generate] media ${i + 1} described (descriptionLength=${description.length})`,
      );
      descriptions.push(description);
    }
  }
  return descriptions;
}

export const postMetadataGenerateJob: JobDefinition<"post.metadata.generate", PlatformMetadata> = {
  type: "post.metadata.generate",
  timeoutMs: 15 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ postId }) => `post.metadata.generate:${postId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      postId: readRequiredString(payload, "postId"),
    } satisfies PostMetadataGeneratePayload;
  },
  async onEnqueue(db, payload) {
    debugLog(`[post.metadata.generate] onEnqueue: postId=${payload.postId}`);
    await db.post.update({
      where: { id: payload.postId },
      data: { metadataStatus: METADATA_STATUS.GENERATING, metadataErrorMessage: null },
    });
  },
  async onStart(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: { metadataStatus: METADATA_STATUS.GENERATING, metadataErrorMessage: null },
    });
  },
  async run(ctx, payload) {
    ctx.log(`[post.metadata.generate] start postId=${payload.postId}`);

    const post = await ctx.db.post.findUnique({
      where: { id: payload.postId },
      include: { media: { orderBy: { order: "asc" } } },
    });

    if (!post) throw new Error(`Post ${payload.postId} not found`);
    if (!post.llmModelId) throw new Error(`Post ${payload.postId} has no LLM model specified`);

    const hasMedia = post.media.length > 0;
    const hasScript = !!post.script;
    const mode = hasMedia ? "media" : hasScript ? "script" : null;

    if (!mode) {
      throw new UserInputError(
        `Post ${payload.postId} has no media and no script — cannot generate captions`,
      );
    }

    ctx.log(
      `[post.metadata.generate] Using ${mode} mode. Fields: title="${post.title}", platform=${post.platform}, llmModelId=${post.llmModelId}`,
    );

    if (isMockEnabled()) {
      ctx.log(`[post.metadata.generate] MOCK MODE: waiting ${MOCK_TIMINGS.POST_CAPTION}ms`);
      await new Promise((resolve) => setTimeout(resolve, MOCK_TIMINGS.POST_CAPTION));
      const mockResult: PlatformMetadata =
        post.platform === "YOUTUBE_SHORTS"
          ? {
              platform: "YOUTUBE_SHORTS",
              title: post.title,
              description: "Mock generated description for this video.",
              tags: ["mock", "content", "generated"],
            }
          : {
              platform: post.platform as "INSTAGRAM" | "TIKTOK",
              caption: "Mock generated caption for this content. #mock #generated",
              hashtags: ["mock", "generated", "content"],
            };
      ctx.log(`[post.metadata.generate] MOCK MODE: returning mock result`);
      return mockResult;
    }

    const adapter = getLLMAdapter(post.llmModelId);

    if (mode === "media") {
      ctx.log(
        `[post.metadata.generate] Media files: count=${post.media.length}, types=[${post.media.map((m) => m.type).join(", ")}]`,
      );

      const mediaBuffers: Buffer[] = [];
      const isVideoArray: boolean[] = [];
      for (const mediaFile of post.media) {
        ctx.log(`[post.metadata.generate] reading media file: ${mediaFile.path}`);
        const buffer = await readFileStorage(mediaFile.path);
        mediaBuffers.push(buffer);
        isVideoArray.push(mediaFile.type === "VIDEO");
      }

      const visualDescriptions = await describeMedia(adapter, mediaBuffers, isVideoArray);
      ctx.log(`[post.metadata.generate] got ${visualDescriptions.length} visual descriptions`);

      const mediaResult = await generateMetadata(
        post.platform,
        {
          visualDescriptions,
          title: post.title,
          details: post.details ?? undefined,
        },
        post.llmModelId,
      );
      ctx.log(`[post.metadata.generate] metadata generated for platform=${post.platform}`);
      return mediaResult;
    }

    // script mode
    ctx.log(`[post.metadata.generate] script mode (length=${post.script?.length})`);
    const scriptResult = await generateMetadata(
      post.platform,
      {
        script: post.script as string,
        title: post.title,
        details: post.details ?? undefined,
      },
      post.llmModelId,
    );
    ctx.log(`[post.metadata.generate] metadata generated for platform=${post.platform}`);
    return scriptResult;
  },
  async onSuccess(db, payload, result) {
    const existing = await db.post.findUnique({
      where: { id: payload.postId },
      select: { type: true },
    });
    const isCaptionPost = existing?.type === "CAPTION";
    debugLog(
      `[post.metadata.generate] onSuccess: postId=${payload.postId}, isCaptionPost=${isCaptionPost}, platform=${(result as PlatformMetadata).platform}`,
    );

    await safeDbUpdate(
      () =>
        db.post.update({
          where: { id: payload.postId },
          data: {
            metadata: result as unknown as Prisma.InputJsonValue,
            metadataStatus: METADATA_STATUS.COMPLETED,
            metadataErrorMessage: null,
            metadataUpdatedAt: new Date(),
            ...(isCaptionPost ? { status: POST_STATUS.COMPLETED } : {}),
          },
        }),
      "post-metadata-generate-success",
      payload.postId,
    );
  },
  async onFailure(db, payload, error) {
    const existing = await db.post.findUnique({
      where: { id: payload.postId },
      select: { type: true },
    });
    const isCaptionPost = existing?.type === "CAPTION";
    debugLog(
      `[post.metadata.generate] onFailure: postId=${payload.postId}, isCaptionPost=${isCaptionPost}, error="${error}"`,
    );

    await safeDbUpdate(
      () =>
        db.post.update({
          where: { id: payload.postId },
          data: {
            metadataStatus: METADATA_STATUS.FAILED,
            metadataErrorMessage: error,
            ...(isCaptionPost ? { status: POST_STATUS.FAILED } : {}),
          },
        }),
      "post-metadata-generate-failure",
      payload.postId,
    );
  },
  classifyError(error) {
    if (error instanceof UserInputError) return "permanent";
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
