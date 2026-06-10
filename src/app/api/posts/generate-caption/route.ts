import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import type { LLMModelAdapter } from "@/lib/llm-models/types";
import { renderPromptTemplate } from "@/lib/prompts";

interface MediaInput {
  type: "image" | "video";
  dataUrl: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid media data URL");
  return { mimeType: match[1], base64: match[2] };
}

async function extractVideoFrame(base64: string): Promise<{ mimeType: string; base64: string }> {
  const id = randomBytes(6).toString("hex");
  const tmpIn = `/tmp/caption_in_${id}.mp4`;
  const tmpOut = `/tmp/caption_out_${id}.jpg`;

  try {
    await writeFile(tmpIn, Buffer.from(base64, "base64"));

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("ffmpeg", ["-i", tmpIn, "-vframes", "1", "-y", tmpOut]);

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

    const frame = await readFile(tmpOut);
    return { mimeType: "image/jpeg", base64: frame.toString("base64") };
  } finally {
    await Promise.all([unlink(tmpIn).catch(() => {}), unlink(tmpOut).catch(() => {})]);
  }
}

async function describeMedia(adapter: LLMModelAdapter, media: MediaInput[]): Promise<string[]> {
  if (media.length === 0) return [];

  const descriptionPrompt = await renderPromptTemplate("describe-media-prompt.txt");

  return Promise.all(
    media.map(async (item) => {
      const { mimeType, base64 } =
        item.type === "video"
          ? await extractVideoFrame(parseDataUrl(item.dataUrl).base64)
          : parseDataUrl(item.dataUrl);

      return adapter.describeImage(descriptionPrompt, base64, mimeType);
    }),
  );
}

export const POST = withAuth(async function POST(req: NextRequest) {
  const { topic, platform, details, llmModelId, media } = await req.json();

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
    const visualDescriptions = await describeMedia(
      adapter,
      (media as MediaInput[] | undefined) ?? [],
    );

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
