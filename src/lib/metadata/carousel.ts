import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { documentFrom, type TextLayer, type TextRole } from "@/lib/design/document";
import { renderPromptTemplate } from "@/lib/prompts";

export interface CarouselSlideSource {
  headline: string | null;
  body: string | null;
  visualPrompt: string;
  imagePath: string | null;
  status: string;
  design: unknown;
  images: { imagePath: string; createdAt: Date }[];
}

export interface SlideCopy {
  role: TextRole;
  text: string;
}

export type SlideBackground =
  | { kind: "none" }
  | { kind: "known"; subject: string }
  | { kind: "unknown" };

export function slideCopy(slide: CarouselSlideSource): SlideCopy[] {
  if (slide.design == null) {
    return [
      { role: "heading" as const, text: slide.headline?.trim() ?? "" },
      { role: "body" as const, text: slide.body?.trim() ?? "" },
    ].filter((copy) => copy.text.length > 0);
  }

  return documentFrom(slide.design)
    .layers.filter((layer): layer is TextLayer => layer.type === "text")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((layer) => ({ role: layer.role, text: layer.text.trim() }))
    .filter((copy) => copy.text.length > 0);
}

export function slideBackground(slide: CarouselSlideSource): SlideBackground {
  if (!slide.imagePath) return { kind: "none" };
  if (slide.status !== CAROUSEL_SLIDE_STATUS.COMPLETED) return { kind: "unknown" };

  const newest = slide.images.reduce<CarouselSlideSource["images"][number] | null>(
    (latest, image) => (!latest || image.createdAt > latest.createdAt ? image : latest),
    null,
  );
  if (newest?.imagePath !== slide.imagePath) return { kind: "unknown" };

  return { kind: "known", subject: slide.visualPrompt };
}

export function describeCarouselSlide(options: {
  number: number;
  total: number;
  copy: SlideCopy[];
  background: Exclude<SlideBackground, { kind: "unknown" }>;
}): Promise<string> {
  return renderPromptTemplate("carousel-slide-description.txt", {
    number: options.number,
    total: options.total,
    copy: options.copy,
    subject: options.background.kind === "known" ? options.background.subject : null,
  });
}
