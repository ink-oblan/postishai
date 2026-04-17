import { GoogleGenAI } from "@google/genai";
import type { ImageModelAdapter, ImageGenerationOptions, ImageGenerationResult } from "../types";

const GEMINI_TIMEOUT_MS = 540_000; // 540s — under the worker's 600s variation job timeout

async function generateWithGeminiImage(
  modelId: string,
  options: ImageGenerationOptions,
  aspectRatio: string = "9:16"
): Promise<ImageGenerationResult> {
  const client = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY!,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });

  const contents = options.sourceImage
    ? [
        {
          parts: [
            { inlineData: { mimeType: options.sourceImage.mimeType, data: options.sourceImage.base64 } },
            { text: options.prompt },
          ],
        },
      ]
    : options.prompt;

  const config = options.sourceImage
    ? { responseModalities: ["IMAGE"] as ["IMAGE"] }
    : { responseModalities: ["IMAGE"] as ["IMAGE"], imageConfig: { aspectRatio } };

  const response = await client.models.generateContent({
    model: modelId,
    contents,
    config,
  });
  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("No image returned from Gemini");
  const mimeType = (part.inlineData.mimeType ?? "image/png") as "image/png" | "image/jpeg";
  return { base64: part.inlineData.data, mimeType };
}

export class NanaBanana2Adapter implements ImageModelAdapter {
  readonly id = "nano-banana-2";
  readonly name = "Nano Banana 2";
  readonly description = "Gemini 3.1 Flash Image — fast, high quality";

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return generateWithGeminiImage("gemini-3.1-flash-image-preview", options, options.aspectRatio);
  }
}

export class NanaBananaProAdapter implements ImageModelAdapter {
  readonly id = "nano-banana-pro";
  readonly name = "Nano Banana Pro";
  readonly description = "Gemini 3 Pro Image — state-of-the-art quality";

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return generateWithGeminiImage("gemini-3-pro-image-preview", options, options.aspectRatio);
  }
}
