import type { ColorItem } from "@/lib/brand-fields";
import type { LayoutName } from "@/lib/design/layouts";
import { renderPromptTemplate } from "@/lib/prompts";

/**
 * Where the layout puts its text, phrased for an image model so it leaves that part of the
 * frame quiet.
 */
const EMPTY_REGION: Record<LayoutName, string> = {
  cover: "centre",
  statement: "lower half",
  list: "upper two thirds",
  quote: "centre",
  cta: "lower half",
};

export function buildSlideImagePrompt(options: {
  visualPrompt: string;
  layout: LayoutName;
  photoStyle?: string | null;
  colors?: ColorItem[];
}): Promise<string> {
  const palette = (options.colors ?? [])
    .map((color) => (color.name ? `${color.name} (${color.hex})` : color.hex))
    .join(", ");

  return renderPromptTemplate("carousel-slide-image-prompt.txt", {
    visualPrompt: options.visualPrompt,
    photoStyle: options.photoStyle?.trim() || null,
    palette: palette || null,
    emptyRegion: EMPTY_REGION[options.layout],
  });
}

export function slideImagePath(postId: string, slideId: string, at: number = Date.now()): string {
  return `posts/${postId}/slides/${slideId}/${at}.jpg`;
}
