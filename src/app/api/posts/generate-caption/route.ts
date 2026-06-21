import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { convertToJpeg } from "@/lib/image-convert";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import type { LLMModelAdapter } from "@/lib/llm-models/types";
import { renderPromptTemplate } from "@/lib/prompts";

const VIDEO_FRAME_COUNT = 10;

class UserInputError extends Error {}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args);

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn("ffprobe", args);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr || `ffprobe exited with code ${code}`));
    });
  });
}

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
    await writeFile(tmpIn, buffer);

    const duration = await getVideoDurationSeconds(tmpIn);

    // Single linear pass: select one frame every (duration/N) seconds.
    // Frames land at 0%, 10%, ..., 90% of duration — no end-of-stream seeking.
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

async function describeMedia(adapter: LLMModelAdapter, media: File[]): Promise<string[]> {
  if (media.length === 0) return [];

  const imageDescriptionPrompt = await renderPromptTemplate("describe-media-prompt.txt");

  const descriptions: string[] = [];
  for (const file of media) {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type.startsWith("video/")) {
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
      descriptions.push(
        await adapter.describeImage(imageDescriptionPrompt, jpeg.toString("base64"), "image/jpeg"),
      );
    }
  }
  return descriptions;
}

export const POST = withAuth(async function POST(req: NextRequest) {
  const formData = await req.formData();
  const topic = formData.get("topic")?.toString();
  const platform = formData.get("platform")?.toString();
  const details = formData.get("details")?.toString();
  const llmModelId = formData.get("llmModelId")?.toString();
  const media = formData.getAll("media").filter((v): v is File => v instanceof File);

  if (!llmModelId) {
    return NextResponse.json({ error: "llmModelId is required" }, { status: 400 });
  }

  const platformLabel =
    platform === "INSTAGRAM"
      ? "Instagram Reels"
      : platform === "TIKTOK"
        ? "TikTok"
        : platform === "YOUTUBE_SHORTS"
          ? "YouTube Shorts"
          : "short-form video";

  try {
    const adapter = getLLMAdapter(llmModelId);
    const visualDescriptions = await describeMedia(adapter, media);

    const prompt = await renderPromptTemplate("caption-generate-prompt.txt", {
      platformLabel,
      topic: topic?.trim(),
      details: details?.trim(),
      visualDescriptions: visualDescriptions.map((d) => d.trim()),
    });

    const caption = await adapter.generate(prompt);
    return NextResponse.json({ caption: caption.trim() });
  } catch (err) {
    console.error("Caption generation failed:", err);
    const status = err instanceof UserInputError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Caption generation failed" },
      { status },
    );
  }
});
