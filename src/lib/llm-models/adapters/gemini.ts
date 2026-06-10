import { GoogleGenAI } from "@google/genai";
import { config } from "../../config";
import type { LLMModelAdapter } from "../types";

export class GeminiAdapter implements LLMModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  constructor(modelId: string, name: string, description: string) {
    this.id = modelId;
    this.name = name;
    this.description = description;
  }

  async generate(prompt: string): Promise<string> {
    const client = new GoogleGenAI({ apiKey: config.google.apiKey });
    const response = await client.models.generateContent({
      model: this.id,
      contents: prompt,
    });
    return response.text ?? "";
  }

  async describeImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    const client = new GoogleGenAI({ apiKey: config.google.apiKey });
    const response = await client.models.generateContent({
      model: this.id,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, { inlineData: { data: imageBase64, mimeType } }],
        },
      ],
    });
    return response.text ?? "";
  }
}
