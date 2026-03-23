export interface ImageGenerationOptions {
  prompt: string;
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: "image/png" | "image/jpeg";
}

export interface ImageModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generate(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}

export interface ImageModelInfo {
  id: string;
  name: string;
  description: string;
}
