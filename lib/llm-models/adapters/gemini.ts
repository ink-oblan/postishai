import { GoogleGenAI } from "@google/genai";
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
    const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
    const response = await client.models.generateContent({
      model: this.id,
      contents: prompt,
    });
    return response.text ?? "";
  }
}
