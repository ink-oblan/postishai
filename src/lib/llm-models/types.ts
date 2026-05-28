export interface LLMImageInput {
  base64: string;
  mimeType: "image/png" | "image/jpeg";
}

export interface LLMModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generate(prompt: string, image?: LLMImageInput): Promise<string>;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  description: string;
}
