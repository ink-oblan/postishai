import { slideImagePath } from "@/lib/carousel/slide-image";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";
import { getImageAdapter } from "@/lib/image-models/registry";
import type { AspectRatio } from "@/lib/image-models/types";
import { isMockEnabled, MOCK_TIMINGS } from "@/lib/mock-config";
import { writeFile } from "@/lib/storage";
import { generateMockSlideImage } from "@/mocks/mock-generators";
import { safeDbUpdate } from "@/workers/db-utils";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { CarouselSlideImagePayload, JobDefinition } from "@/workers/types";

type CarouselSlideImageResult = {
  imagePath: string;
  prompt: string;
};

export const carouselSlideImageJob: JobDefinition<
  "carousel.slide.image.generate",
  CarouselSlideImageResult
> = {
  type: "carousel.slide.image.generate",
  timeoutMs: 10 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ slideId }) => `carousel.slide.image.generate:${slideId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      slideId: readRequiredString(payload, "slideId"),
      prompt: readRequiredString(payload, "prompt"),
      imageModel: readRequiredString(payload, "imageModel"),
      aspectRatio: readRequiredString(payload, "aspectRatio") as AspectRatio,
    } satisfies CarouselSlideImagePayload;
  },
  async onEnqueue(db, payload) {
    await db.carouselSlide.update({
      where: { id: payload.slideId },
      data: { status: CAROUSEL_SLIDE_STATUS.GENERATING, errorMessage: null },
    });
  },
  async onStart(db, payload) {
    await db.carouselSlide.update({
      where: { id: payload.slideId },
      data: { status: CAROUSEL_SLIDE_STATUS.GENERATING, errorMessage: null },
    });
  },
  async run(ctx, payload) {
    const { slideId, prompt, imageModel, aspectRatio } = payload;
    const startedAt = Date.now();
    const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

    ctx.log(`[carousel.slide.image] start slideId=${slideId} model=${imageModel}`);

    const slide = await ctx.db.carouselSlide.findUnique({ where: { id: slideId } });
    if (!slide) throw new Error(`CarouselSlide ${slideId} not found`);

    const imagePath = slideImagePath(slide.postId, slideId);

    if (isMockEnabled()) {
      ctx.log(`[carousel.slide.image] MOCK MODE: waiting ${MOCK_TIMINGS.CAROUSEL_SLIDE}ms`);
      await new Promise((resolve) => setTimeout(resolve, MOCK_TIMINGS.CAROUSEL_SLIDE));
      await writeFile(imagePath, await generateMockSlideImage(slideId, aspectRatio));
      ctx.log(`[carousel.slide.image] MOCK MODE: saved to ${imagePath}`);
      return { imagePath, prompt };
    }

    ctx.log(`[carousel.slide.image] calling image model... (${elapsed()})`);
    const result = await getImageAdapter(imageModel).generate({
      prompt,
      aspectRatio,
      // 1K comes back under 1080px on the short edge, which the 1080px canvas would upscale.
      imageSize: "2K",
    });
    ctx.log(`[carousel.slide.image] image model returned ${result.mimeType} (${elapsed()})`);

    await writeFile(imagePath, Buffer.from(result.base64, "base64"));
    ctx.log(`[carousel.slide.image] done, saved to ${imagePath} (${elapsed()})`);

    return { imagePath, prompt };
  },
  async onSuccess(db, payload, result) {
    await safeDbUpdate(
      async () => {
        await db.carouselSlide.update({
          where: { id: payload.slideId },
          data: {
            imagePath: result.imagePath,
            imageModel: payload.imageModel,
            status: CAROUSEL_SLIDE_STATUS.COMPLETED,
            errorMessage: null,
          },
        });
        // Kept so the editor can offer the earlier backgrounds back after a regenerate.
        await db.carouselSlideImage.create({
          data: {
            slideId: payload.slideId,
            imagePath: result.imagePath,
            prompt: result.prompt,
          },
        });
      },
      "carousel-slide-image-success",
      payload.slideId,
    );
  },
  async onFailure(db, payload, error) {
    await safeDbUpdate(
      () =>
        db.carouselSlide.update({
          where: { id: payload.slideId },
          data: { status: CAROUSEL_SLIDE_STATUS.FAILED, errorMessage: error },
        }),
      "carousel-slide-image-failure",
      payload.slideId,
    );
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
