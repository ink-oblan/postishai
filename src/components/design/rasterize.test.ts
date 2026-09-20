import type Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignDocument } from "@/lib/design/document";
import { rasterizeStage, waitForLogos } from "./rasterize";

vi.mock("./DesignStage", () => ({
  BACKGROUND_NODE_NAME: "slide-background",
  EDITOR_CHROME_NAME: "editor-chrome",
}));
vi.mock("@/lib/design/fonts", async (original) => ({
  ...(await original<object>()),
  ensureFontsLoaded: vi.fn().mockResolvedValue(undefined),
  remeasureText: vi.fn(),
}));

const document: DesignDocument = {
  background: { kind: "solid", color: "#000000" },
  layers: ["one", "two"].map((id) => ({
    id,
    type: "logo",
    assetId: id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
  })),
};
const assetUrl = (assetId: string) => `/assets/${assetId}`;

function image(assetId: string) {
  const element = new Image();
  element.src = assetUrl(assetId);
  Object.defineProperties(element, { complete: { value: true }, naturalWidth: { value: 100 } });
  return element;
}
function canvas() {
  const nodes = new Map<
    string,
    { id: () => string; getAttr: () => string; image?: () => HTMLImageElement }
  >();
  const stage = {
    findOne: (predicate: (node: unknown) => boolean) => [...nodes.values()].find(predicate),
    find: () => [],
    draw: vi.fn(),
    width: () => 420,
    height: () => 525,
    toCanvas: vi.fn(() => ({
      width: 1080,
      height: 1350,
      toBlob: (callback: BlobCallback) => callback(new Blob(["image"], { type: "image/png" })),
    })),
    toBlob: vi.fn().mockResolvedValue(new Blob(["image"], { type: "image/png" })),
  };
  const loaded = (id: string, assetId = id) =>
    nodes.set(id, { id: () => id, getAttr: () => "loaded", image: () => image(assetId) });
  return { stage: stage as unknown as Konva.Stage, nodes, loaded, toBlob: stage.toCanvas };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("logo rasterization", () => {
  it("does not export while a later logo still has its placeholder", async () => {
    const { stage, nodes, loaded, toBlob } = canvas();
    loaded("one");
    nodes.set("two", { id: () => "two", getAttr: () => "loading" });
    const render = rasterizeStage(
      stage,
      document,
      {
        width: 1080,
        height: 1350,
        safeZone: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      { assetUrl },
    );
    await vi.advanceTimersByTimeAsync(100);
    expect(toBlob).not.toHaveBeenCalled();
    loaded("two");
    await vi.advanceTimersByTimeAsync(50);
    await expect(render).resolves.toBeInstanceOf(Blob);
    expect(toBlob).toHaveBeenCalledOnce();
  });
  it("rejects a failed logo before taking a snapshot", async () => {
    const { stage, nodes, loaded, toBlob } = canvas();
    loaded("one");
    nodes.set("two", { id: () => "two", getAttr: () => "error" });
    await expect(
      rasterizeStage(
        stage,
        document,
        { width: 1080, height: 1350, safeZone: { top: 0, right: 0, bottom: 0, left: 0 } },
        { assetUrl },
      ),
    ).rejects.toThrow("logo failed to load");
    expect(toBlob).not.toHaveBeenCalled();
  });
  it("does not accept a cached image belonging to the previous asset", async () => {
    const { stage, loaded } = canvas();
    loaded("one");
    loaded("two", "previous-logo");
    let finished = false;
    const wait = waitForLogos(stage, document, assetUrl).then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(finished).toBe(false);
    loaded("two");
    await vi.advanceTimersByTimeAsync(50);
    await wait;
    expect(finished).toBe(true);
  });
  it("reports logos that never reach the stage", async () => {
    const { stage } = canvas();
    const wait = expect(waitForLogos(stage, document, assetUrl, 100)).rejects.toThrow(
      "logos did not finish loading",
    );
    await vi.advanceTimersByTimeAsync(100);
    await wait;
  });
  it("does not delay documents without logos", async () => {
    const { stage } = canvas();
    await waitForLogos(stage, { ...document, layers: [] }, assetUrl);
    expect(vi.getTimerCount()).toBe(0);
  });
});
