import {
  generateScenario,
  mockScenario,
  ScenarioResponseError,
  type ScenarioSlide,
} from "@/lib/carousel/scenario";
import { CAROUSEL_SLIDE_STATUS, CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { isMockEnabled, MOCK_TIMINGS, mockDelay } from "@/lib/mock-config";
import { safeDbUpdate } from "@/workers/db-utils";
import {
  isRetryableError,
  parseObjectPayload,
  readRequiredNumber,
  readRequiredString,
} from "@/workers/job-utils";
import type { CarouselScenarioPayload, JobDefinition } from "@/workers/types";

type CarouselScenarioResult = {
  slides: ScenarioSlide[];
};

export const carouselScenarioJob: JobDefinition<
  "carousel.scenario.generate",
  CarouselScenarioResult
> = {
  type: "carousel.scenario.generate",
  timeoutMs: 5 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ postId }) => `carousel.scenario.generate:${postId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      postId: readRequiredString(payload, "postId"),
      slideCount: readRequiredNumber(payload, "slideCount"),
    } satisfies CarouselScenarioPayload;
  },
  async onEnqueue(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: POST_STATUS.GENERATING,
        carouselStage: CAROUSEL_STAGE.SCENARIO,
        // The payload is what the plan is actually written against, so it owns the stored count.
        carouselSlideCount: payload.slideCount,
        errorMessage: null,
        generationStartedAt: new Date(),
      },
    });
  },
  async onStart(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        status: POST_STATUS.GENERATING,
        errorMessage: null,
        generationStartedAt: new Date(),
      },
    });
  },
  async run(ctx, payload) {
    const { postId, slideCount } = payload;
    ctx.log(`[carousel.scenario] start postId=${postId} slides=${slideCount}`);

    const post = await ctx.db.post.findUnique({
      where: { id: postId },
      include: { brandProfile: true },
    });
    if (!post) throw new Error(`Post ${postId} not found`);

    if (isMockEnabled()) {
      ctx.log(`[carousel.scenario] MOCK MODE: waiting ${MOCK_TIMINGS.CAROUSEL_SCENARIO}ms`);
      await mockDelay(MOCK_TIMINGS.CAROUSEL_SCENARIO);
      return { slides: mockScenario(post.title, slideCount) };
    }

    const slides = await generateScenario({
      title: post.title,
      platform: post.platform,
      slideCount,
      details: post.details,
      brand: post.brandProfile,
      llmModelId: post.llmModelId,
    });
    ctx.log(`[carousel.scenario] planned ${slides.length} slides postId=${postId}`);

    return { slides };
  },
  async onSuccess(db, payload, result) {
    await safeDbUpdate(
      async () => {
        // The plan is written whole, so a retry replaces whatever the failed attempt left behind.
        await db.carouselSlide.deleteMany({ where: { postId: payload.postId } });
        await db.carouselSlide.createMany({
          data: result.slides.map((slide, order) => ({
            postId: payload.postId,
            order,
            headline: slide.headline,
            body: slide.body || null,
            visualPrompt: slide.visualPrompt,
            layout: slide.layout,
            status: CAROUSEL_SLIDE_STATUS.PENDING,
          })),
        });
        await db.post.update({
          where: { id: payload.postId },
          data: {
            status: POST_STATUS.DRAFT,
            carouselStage: CAROUSEL_STAGE.SCENARIO,
            errorMessage: null,
          },
        });
      },
      "carousel-scenario-success",
      payload.postId,
    );
  },
  async onFailure(db, payload, error) {
    await safeDbUpdate(
      async () => {
        // The slides are only replaced on success, so a rewrite that fails still has the plan the
        // user was working from — leaving that post FAILED would strand a carousel that is fine.
        const kept = await db.carouselSlide.count({ where: { postId: payload.postId } });
        await db.post.update({
          where: { id: payload.postId },
          data: {
            status: kept > 0 ? POST_STATUS.DRAFT : POST_STATUS.FAILED,
            errorMessage: error,
          },
        });
      },
      "carousel-scenario-failure",
      payload.postId,
    );
  },
  classifyError(error) {
    // A malformed or short answer is the model having a bad turn, which another turn often fixes.
    if (error instanceof ScenarioResponseError) return "retryable";
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
