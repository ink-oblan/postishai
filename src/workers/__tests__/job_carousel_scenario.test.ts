import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioResponseError } from "@/lib/carousel/scenario";
import { carouselScenarioJob } from "@/workers/job_carousel_scenario";

const db = {
  post: { update: vi.fn() },
  carouselSlide: { deleteMany: vi.fn(), createMany: vi.fn(), count: vi.fn() },
};

const payload = { postId: "post", slideCount: 2 };

const slides = [
  { headline: "Hook", body: "Supporting copy", visualPrompt: "A gradient", layout: "cover" },
  { headline: "Close", body: "", visualPrompt: "A door", layout: "cta" },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  db.post.update.mockResolvedValue(undefined);
  db.carouselSlide.deleteMany.mockResolvedValue(undefined);
  db.carouselSlide.createMany.mockResolvedValue(undefined);
  db.carouselSlide.count.mockResolvedValue(0);
});

describe("carousel scenario job", () => {
  it("parses the payload the enqueue side writes", () => {
    expect(carouselScenarioJob.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it("rejects a payload without a slide count", () => {
    expect(() => carouselScenarioJob.parse(JSON.stringify({ postId: "post" }))).toThrow(
      /slideCount/,
    );
  });

  it("marks the post generating as soon as the job is queued", async () => {
    await carouselScenarioJob.onEnqueue?.(db as never, payload, {} as never);

    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "post" },
      data: expect.objectContaining({
        status: "GENERATING",
        carouselStage: "SCENARIO",
        carouselSlideCount: 2,
        errorMessage: null,
      }),
    });
  });

  it("replaces the slides and releases the post to a draft", async () => {
    await carouselScenarioJob.onSuccess?.(
      db as never,
      payload,
      { slides: [...slides] } as never,
      {} as never,
    );

    expect(db.carouselSlide.deleteMany).toHaveBeenCalledWith({ where: { postId: "post" } });
    expect(db.carouselSlide.createMany).toHaveBeenCalledWith({
      data: [
        {
          postId: "post",
          order: 0,
          headline: "Hook",
          body: "Supporting copy",
          visualPrompt: "A gradient",
          layout: "cover",
          status: "PENDING",
        },
        {
          postId: "post",
          order: 1,
          headline: "Close",
          body: null,
          visualPrompt: "A door",
          layout: "cta",
          status: "PENDING",
        },
      ],
    });
    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "post" },
      data: { status: "DRAFT", carouselStage: "SCENARIO", errorMessage: null },
    });
  });

  it("leaves the post failed with the reason when the plan never lands", async () => {
    db.carouselSlide.count.mockResolvedValue(0);

    await carouselScenarioJob.onFailure?.(db as never, payload, "the model gave up", {} as never);

    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "post" },
      data: { status: "FAILED", errorMessage: "the model gave up" },
    });
    expect(db.carouselSlide.deleteMany).not.toHaveBeenCalled();
  });

  it("hands a failed rewrite back as a draft, because the earlier plan is still there", async () => {
    db.carouselSlide.count.mockResolvedValue(4);

    await carouselScenarioJob.onFailure?.(db as never, payload, "the model gave up", {} as never);

    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "post" },
      data: { status: "DRAFT", errorMessage: "the model gave up" },
    });
    expect(db.carouselSlide.deleteMany).not.toHaveBeenCalled();
  });

  it("retries a malformed answer but not a broken prompt", () => {
    expect(carouselScenarioJob.classifyError(new ScenarioResponseError("bad json"))).toBe(
      "retryable",
    );
    expect(carouselScenarioJob.classifyError(new Error("invalid api key"))).toBe("permanent");
  });
});
