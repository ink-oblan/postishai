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

async function getVideoDurationSeconds(path: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ]);

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
        resolve(Number.parseFloat(stdout.trim()));
        return;
      }
      reject(new Error(stderr || `ffprobe exited with code ${code}`));
    });
  });
}

async function extractVideoFrames(buffer: Buffer): Promise<{ mimeType: string; base64: string }[]> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/caption_in_${id}.mp4`;
  const tmpOuts = Array.from(
    { length: VIDEO_FRAME_COUNT },
    (_, i) => `/tmp/caption_out_${id}_${i}.jpg`,
  );

  try {
    await writeFile(tmpIn, buffer);

    const duration = await getVideoDurationSeconds(tmpIn);

    const frames: { mimeType: string; base64: string }[] = [];
    for (let i = 0; i < tmpOuts.length; i++) {
      const tmpOut = tmpOuts[i];
      const timestamp = (duration * i) / (VIDEO_FRAME_COUNT - 1);
      await runFfmpeg(["-ss", timestamp.toFixed(3), "-i", tmpIn, "-vframes", "1", "-y", tmpOut]);
      const frame = await readFile(tmpOut);
      frames.push({ mimeType: "image/jpeg", base64: frame.toString("base64") });
      await unlink(tmpOut).catch(() => {});
    }
    return frames;
  } finally {
    await Promise.all([
      unlink(tmpIn).catch(() => {}),
      ...tmpOuts.map((tmpOut) => unlink(tmpOut).catch(() => {})),
    ]);
  }
}

async function describeMedia(adapter: LLMModelAdapter, media: File[]): Promise<string[]> {
  if (media.length === 0) return [];

  const imageDescriptionPrompt = await renderPromptTemplate("describe-media-prompt.txt");

  return Promise.all(
    media.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type.startsWith("video/")) {
        const frames = await extractVideoFrames(buffer);
        const videoDescriptionPrompt = await renderPromptTemplate(
          "describe-video-frames-prompt.txt",
          { frameCount: frames.length },
        );
        return adapter.describeImages(videoDescriptionPrompt, frames);
      }

      const jpeg = await convertToJpeg(buffer);
      return adapter.describeImage(imageDescriptionPrompt, jpeg.toString("base64"), "image/jpeg");
    }),
  );
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Caption generation failed" },
      { status: 500 },
    );
  }
});
