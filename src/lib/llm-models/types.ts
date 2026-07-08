export interface LLMImageInput {
  base64: string;
  mimeType: "image/jpeg";
}

export interface LLMModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generate(prompt: string, image?: LLMImageInput): Promise<string>;
  describeImage(prompt: string, imageBase64: string, mimeType: string): Promise<string>;
  describeImages(
    prompt: string,
    images: { base64: string; mimeType: string }[],
    audio?: { base64: string; mimeType: string },
  ): Promise<string>;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  description: string;
}
