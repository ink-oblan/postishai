import { GoogleGenAI } from "@google/genai";
import { config } from "../../config";
import type { ImageGenerationOptions, ImageGenerationResult, ImageModelAdapter } from "../types";

const GEMINI_TIMEOUT_MS = 540_000; // 540s — under the worker's 600s variation job timeout

async function generateWithGeminiImage(
  modelId: string,
  options: ImageGenerationOptions,
  aspectRatio: string = "9:16",
): Promise<ImageGenerationResult> {
  const client = new GoogleGenAI({
    apiKey: config.google.apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });

  const contents = options.sourceImage
    ? [
        {
          parts: [
            {
              inlineData: {
                mimeType: options.sourceImage.mimeType,
                data: options.sourceImage.base64,
              },
            },
            { text: options.prompt },
          ],
        },
      ]
    : options.prompt;

  const generateConfig = options.sourceImage
    ? { responseModalities: ["IMAGE"] as ["IMAGE"] }
    : { responseModalities: ["IMAGE"] as ["IMAGE"], imageConfig: { aspectRatio } };

  const response = await client.models.generateContent({
    model: modelId,
    contents,
    config: generateConfig,
  });
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData?.data) {
    const finishReason = candidate?.finishReason ?? "unknown";
    const blockReason = response.promptFeedback?.blockReason ?? null;
    const textPart = candidate?.content?.parts?.find((p) => p.text)?.text ?? null;
    const detail = [
      `finishReason=${finishReason}`,
      blockReason ? `blockReason=${blockReason}` : null,
      textPart ? `text="${textPart.slice(0, 200)}"` : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`No image returned from Gemini (${detail})`);
  }
  const mimeType = (part.inlineData.mimeType ?? "image/png") as "image/png" | "image/jpeg";
  return { base64: part.inlineData.data, mimeType };
}

export class NanaBanana2Adapter implements ImageModelAdapter {
  readonly id = "nano-banana-2";
  readonly name = "Nano Banana 2";
  readonly description = "High quality";

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return generateWithGeminiImage("gemini-3.1-flash-image-preview", options, options.aspectRatio);
  }
}

export class NanaBananaProAdapter implements ImageModelAdapter {
  readonly id = "nano-banana-pro";
  readonly name = "Nano Banana Pro";
  readonly description = "State of the art quality";

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return generateWithGeminiImage("gemini-3-pro-image-preview", options, options.aspectRatio);
  }
}
