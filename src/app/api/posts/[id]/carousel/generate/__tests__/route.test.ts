import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FontItem } from "@/lib/brand-fields";
import type { DesignDocument } from "@/lib/design/document";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  findPost: vi.fn(),
  updateSlide: vi.fn(),
  updatePost: vi.fn(),
  queue: vi.fn(),
}));
vi.mock("@/lib/auth/dal", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => (req: unknown, ctx: unknown) =>
    handler(req, ctx, { userId: "user" }),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    post: { findFirst: mocks.findPost },
    $transaction: (run: (tx: unknown) => Promise<unknown>) =>
      run({ carouselSlide: { update: mocks.updateSlide }, post: { update: mocks.updatePost } }),
  },
}));
vi.mock("@/lib/carousel/slide-background", () => ({ queueSlideBackground: mocks.queue }));
vi.mock("@/lib/image-models/registry", () => ({
  DEFAULT_IMAGE_MODEL_ID: "model",
  getImageAdapter: vi.fn(),
}));
vi.mock("@/lib/carousel/scenario", () => ({
  coerceLayout: () => "statement",
  SCENARIO_PLANNING_ERROR: "The plan is still being written",
}));

async function generate(typography: FontItem[]) {
  mocks.findPost.mockResolvedValue({
    id: "post",
    platform: "INSTAGRAM",
    status: "DRAFT",
    carouselStage: "SCENARIO",
    brandProfile: { typography, colors: [] },
    slides: [
      {
        id: "slide",
        order: 0,
        layout: "statement",
        headline: "Headline",
        body: "Body text",
        visualPrompt: "Background",
      },
    ],
  });
  const response = await POST(
    new NextRequest("http://localhost/api/posts/post/carousel/generate", {
      method: "POST",
      body: "{}",
    }),
    { params: Promise.resolve({ id: "post" }) },
  );
  expect(response.status).toBe(200);
  return mocks.updateSlide.mock.calls.at(-1)?.[0].data.design as DesignDocument;
}
beforeEach(() => vi.clearAllMocks());

describe("generated brand typography", () => {
  it("stores uploaded font identifiers for both roles", async () => {
    const design = await generate([
      { id: "h", name: "My heading font", source: "uploaded", assetId: "heading-asset" },
      { id: "b", name: "My body font", source: "uploaded", assetId: "body-asset" },
    ]);
    expect(design.layers.filter((l) => l.type === "text").map((l) => l.fontFamily)).toEqual([
      "brandfont-heading-asset",
      "brandfont-body-asset",
    ]);
  });
  it("retains built-in names and handles a single uploaded font", async () => {
    const builtin = await generate([{ id: "h", name: "Roboto", source: "builtin" }]);
    expect(builtin.layers.filter((l) => l.type === "text").map((l) => l.fontFamily)).toEqual([
      "Roboto",
      "Roboto",
    ]);
    const uploaded = await generate([
      { id: "h", name: "Brand", source: "uploaded", assetId: "single" },
    ]);
    expect(uploaded.layers.filter((l) => l.type === "text").map((l) => l.fontFamily)).toEqual([
      "brandfont-single",
      "brandfont-single",
    ]);
  });
});
