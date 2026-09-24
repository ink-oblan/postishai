export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

/**
 * Gemini's default 1K tops out around 896px on the short edge, which is below the 1080px a
 * feed image needs. Ask for 2K wherever the output is rendered at full size rather than
 * previewed.
 */
export type ImageSize = "1K" | "2K" | "4K";

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  sourceImage?: {
    base64: string;
    mimeType: "image/jpeg";
  };
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: "image/jpeg";
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
