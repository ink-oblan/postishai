export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: AspectRatio;
  sourceImage?: {
    base64: string;
    mimeType: "image/png" | "image/jpeg";
  };
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
