import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { carouselLayoutTheme } from "@/lib/carousel/theme";
import { ScenarioEditor, type ScenarioSlideInput } from "./ScenarioEditor";
import type { StoryboardSlide } from "./ScenarioStoryboard";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  refresh: vi.fn(),
  reorder: { current: null as ((slides: StoryboardSlide[]) => void) | null },
  slides: { current: null as StoryboardSlide[] | null },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("@/app/(app)/brand/lib/font-catalogue", () => ({
  resolveFontFamily: (name: string) => name,
  registerBrandFont: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/design/fonts", async (original) => ({
  ...(await original<object>()),
  ensureFontsLoaded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/design/measure-text", () => ({ textMeasurer: () => () => 120 }));

vi.mock("./ScenarioStoryboard", () => ({
  ScenarioStoryboard: ({
    slides,
    selectedKey,
    onSelect,
    onReorder,
  }: {
    slides: StoryboardSlide[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
    onReorder: (slides: StoryboardSlide[]) => void;
  }) => {
    mocks.reorder.current = onReorder;
    mocks.slides.current = slides;
    return (
      <ul>
        {slides.map((slide) => (
          <li key={slide.key}>
            <button
              type="button"
              data-testid="scenario-slide"
              aria-current={selectedKey === slide.key}
              onClick={() => onSelect(slide.key)}
            >
              {slide.role ?? "middle"}
              {slide.incomplete ? " incomplete" : ""}
              {` layers:${slide.document.layers.length}`}
            </button>
          </li>
        ))}
      </ul>
    );
  },
}));

const THEME = carouselLayoutTheme(null);

function slide(index: number, overrides: Partial<ScenarioSlideInput> = {}): ScenarioSlideInput {
  return {
    id: `slide-${index}`,
    headline: `Headline ${index}`,
    body: `Body ${index}`,
    visualPrompt: `Visual ${index}`,
    layout: index === 0 ? "cover" : "statement",
    ...overrides,
  };
}

function setup(slides: ScenarioSlideInput[] = [slide(0), slide(1), slide(2)]) {
  return render(
    <ScenarioEditor
      postId="post-1"
      platform="INSTAGRAM"
      initialSlides={slides}
      theme={THEME}
      uploadedFonts={[]}
    />,
  );
}

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reorder.current = null;
  mocks.slides.current = null;
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(ok({ slides: [] }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("ScenarioEditor", () => {
  it("opens and adds slides over LAN HTTP without crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });

    setup([slide(0), slide(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Add slide" }));

    expect(screen.getAllByTestId("scenario-slide")).toHaveLength(3);
    expect(screen.getByLabelText("Headline")).toHaveValue("");
  });

  it("shows a storyboard card per slide, badged hook and cta at the ends", () => {
    setup();

    const cards = screen.getAllByTestId("scenario-slide");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("hook");
    expect(cards[1]).toHaveTextContent("middle");
    expect(cards[2]).toHaveTextContent("cta");
  });

  it("previews the copy as real layers rather than describing it", () => {
    setup([slide(0)]);

    expect(screen.getByTestId("scenario-slide")).toHaveTextContent("layers:2");
  });

  it("opens the first slide in the inspector and follows the selection", () => {
    setup();

    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 0");

    fireEvent.click(screen.getAllByTestId("scenario-slide")[2]);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 2");
    expect(screen.getByText("Slide 3 of 3")).toBeInTheDocument();
  });

  it("writes an edit back to the selected slide only", () => {
    setup();

    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Rewritten" } });
    expect(screen.getByLabelText("Headline")).toHaveValue("Rewritten");

    fireEvent.click(screen.getAllByTestId("scenario-slide")[1]);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 1");
  });

  it("keeps the background prompt out of the way until it is asked for", () => {
    setup();

    expect(screen.queryByDisplayValue("Visual 0")).toBeNull();

    fireEvent.click(screen.getByText("Background prompt"));
    expect(screen.getByDisplayValue("Visual 0")).toBeInTheDocument();
  });

  it("names the slide that is missing a background prompt", () => {
    setup([slide(0), slide(1, { visualPrompt: "" }), slide(2)]);

    const cards = screen.getAllByTestId("scenario-slide");
    expect(cards[0]).not.toHaveTextContent("incomplete");
    expect(cards[1]).toHaveTextContent("incomplete");
    expect(screen.getByRole("button", { name: /Approve/ })).toBeDisabled();
  });

  it("reorders the plan from the storyboard", () => {
    setup();

    act(() => mocks.reorder.current?.([...(mocks.slides.current ?? [])].reverse()));

    fireEvent.click(screen.getAllByTestId("scenario-slide")[0]);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 2");

    fireEvent.click(screen.getAllByTestId("scenario-slide")[2]);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 0");
  });

  it("saves a reordered plan in its new order", async () => {
    setup();
    mocks.fetch.mockResolvedValue(ok({ slides: [slide(2), slide(1), slide(0)] }));

    act(() => mocks.reorder.current?.([...(mocks.slides.current ?? [])].reverse()));
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body.slides.map((s: { id: string }) => s.id)).toEqual(["slide-2", "slide-1", "slide-0"]);
  });

  it("saves the plan in its current order", async () => {
    setup();
    mocks.fetch.mockResolvedValue(ok({ slides: [slide(0), slide(1), slide(2)] }));

    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toBe("/api/posts/post-1/carousel/scenario");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body).slides.map((s: { headline: string }) => s.headline)).toEqual([
      "Headline 0",
      "Headline 1",
      "Headline 2",
    ]);
  });

  it("says how many backgrounds approving will generate", () => {
    setup();

    expect(screen.getByRole("button", { name: "Approve · generate 3 backgrounds" })).toBeEnabled();
  });

  it("saves before starting generation, so the plan on the server is the one designed", async () => {
    setup();
    mocks.fetch.mockResolvedValue(ok({ slides: [slide(0), slide(1), slide(2)] }));

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.calls[0][0]).toBe("/api/posts/post-1/carousel/scenario");
    expect(mocks.fetch.mock.calls[1][0]).toBe("/api/posts/post-1/carousel/generate");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("saves then hands the rewrite to the worker instead of holding the editor open", async () => {
    setup();
    mocks.fetch.mockResolvedValue(ok({ slides: [slide(0), slide(1), slide(2)] }));

    fireEvent.click(screen.getByRole("button", { name: /Rewrite all/ }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.calls[0][0]).toBe("/api/posts/post-1/carousel/scenario");
    expect(mocks.fetch.mock.calls[1][0]).toBe("/api/posts/post-1/carousel/scenario/plan");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("does not generate when the save is rejected", async () => {
    setup();
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Nope" }),
      text: async () => '{"error":"Nope"}',
    });

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("selects a newly added slide and refuses to delete below the platform floor", () => {
    setup([slide(0), slide(1)]);

    expect(screen.getByRole("button", { name: "Delete slide" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Add slide" }));

    expect(screen.getAllByTestId("scenario-slide")).toHaveLength(3);
    expect(screen.getByLabelText("Headline")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Delete slide" })).toBeEnabled();
  });

  it("falls back to the first slide when the selected one is deleted", () => {
    setup();

    fireEvent.click(screen.getAllByTestId("scenario-slide")[2]);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 2");

    fireEvent.click(screen.getByRole("button", { name: "Delete slide" }));

    expect(screen.getAllByTestId("scenario-slide")).toHaveLength(2);
    expect(screen.getByLabelText("Headline")).toHaveValue("Headline 0");
  });
});
