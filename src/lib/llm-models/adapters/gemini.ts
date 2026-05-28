import { GoogleGenAI } from "@google/genai";
import { config } from "../../config";
import type { LLMImageInput, LLMModelAdapter } from "../types";

export class GeminiAdapter implements LLMModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  constructor(modelId: string, name: string, description: string) {
    this.id = modelId;
    this.name = name;
    this.description = description;
  }

  async generate(prompt: string, image?: LLMImageInput): Promise<string> {
    const client = new GoogleGenAI({ apiKey: config.google.apiKey });
    const contents = image
      ? [
          {
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.base64 } },
              { text: prompt },
            ],
          },
        ]
      : prompt;

    const response = await client.models.generateContent({
      model: this.id,
      contents,
    });
    return response.text ?? "";
  }
}
