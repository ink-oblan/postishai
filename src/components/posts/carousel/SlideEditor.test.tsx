import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignDocument, Layer } from "@/lib/design/document";
import { type EditorSlide, SlideEditor } from "./SlideEditor";

const mocks = vi.hoisted(() => ({
  rasterize: vi.fn(),
  fonts: vi.fn(),
  reflow: vi.fn(),
  fetch: vi.fn(),
  error: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next/dynamic", () => ({ default: () => TestStage }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock("@/app/(app)/brand/lib/font-catalogue", () => ({
  builtinFontChoices: () => [],
  resolveFontFamily: (name: string) => name,
  brandAssetUrl: (assetId: string) => `/assets/${assetId}`,
  registerBrandFont: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/design/fonts", async (original) => ({
  ...(await original<object>()),
  ensureFontsLoaded: mocks.fonts,
}));
vi.mock("@/lib/design/measure-text", () => ({ textMeasurer: () => vi.fn() }));
vi.mock("@/lib/design/reflow", () => ({ reflowAutoLayout: mocks.reflow }));
vi.mock("@/components/design/rasterize", () => ({
  rasterizeStage: mocks.rasterize,
  waitForBackground: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/components/design/LayerInspector", () => ({ LayerInspector: () => null }));
vi.mock("@/components/design/sample-background", () => ({
  sampleBackgroundRegion: vi.fn().mockResolvedValue({ r: 200, g: 200, b: 200 }),
}));
vi.mock("@/components/design/ShortcutDialog", () => ({ ShortcutDialog: () => null }));
vi.mock("./BackgroundPicker", () => ({ BackgroundPicker: () => null }));
vi.mock("./CarouselPreviewDialog", () => ({
  CarouselPreviewDialog: ({ open }: { open: boolean }) => (open ? <div>Preview ready</div> : null),
}));
vi.mock("./SlideFilmstrip", () => ({
  SlideFilmstrip: ({
    slides,
    selectedId,
    onSelect,
  }: {
    slides: EditorSlide[];
    selectedId: string;
    onSelect: (id: string) => void;
  }) => (
    <nav>
      {slides.map((slide) => (
        <button
          key={slide.id}
          type="button"
          aria-current={selectedId === slide.id}
          onClick={() => onSelect(slide.id)}
        >
          Slide {slide.id}
        </button>
      ))}
    </nav>
  ),
}));
// Keep the editor hook and keyboard handlers real; replace only the canvas boundary.
function TestStage({
  document,
  stageRef,
  onLayerChange,
}: {
  document: DesignDocument;
  stageRef: { current: unknown };
  onLayerChange: (id: string, patch: Partial<Layer>) => void;
}) {
  useLayoutEffect(() => {
    stageRef.current = { document };
  }, [document, stageRef]);
  const layer = document.layers[0];
  return (
    <input
      aria-label="Slide text"
      value={layer?.type === "text" ? layer.text : ""}
      onChange={(event) => onLayerChange(layer.id, { text: event.target.value })}
    />
  );
}

function document(text: string): DesignDocument {
  return {
    background: { kind: "solid", color: "#000000" },
    layers: [
      {
        id: "text",
        type: "text",
        x: 30,
        y: 30,
        width: 800,
        height: 100,
        rotation: 0,
        text,
        role: "heading",
        fontFamily: "Inter",
        fontSize: 60,
        fontWeight: 700,
        italic: false,
        underline: false,
        lineThrough: false,
        lineHeight: 1.2,
        align: "left",
        color: "#ffffff",
      },
    ],
  };
}
const AUTOSAVE_WAIT = 2000;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function mount() {
  const slides = ["a", "b"].map(
    (id, order): EditorSlide => ({
      id,
      order,
      headline: id,
      visualPrompt: "",
      status: "READY",
      hasImage: true,
      imageVersion: 1,
      design: document(id),
    }),
  );
  return render(
    <StrictMode>
      <SlideEditor
        postId="post"
        platform="INSTAGRAM"
        initialSlides={slides}
        logoAssetId={null}
        uploadedFonts={[]}
      />
    </StrictMode>,
  );
}
async function ready() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
}
function edit(text: string) {
  fireEvent.change(screen.getByLabelText("Slide text"), { target: { value: text } });
}
function text() {
  return (screen.getByLabelText("Slide text") as HTMLInputElement).value;
}
function slideSaves(slideId: string) {
  return mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith(`/slides/${slideId}`));
}
function saves(slideId: string): number {
  return slideSaves(slideId).length;
}
function savedDesign(slideId: string): DesignDocument | null {
  const call = slideSaves(slideId).at(-1);
  return call ? JSON.parse(call[1].body).design : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fonts.mockResolvedValue(undefined);
  mocks.reflow.mockReturnValue(null);
  mocks.fetch.mockImplementation(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  mocks.rasterize.mockImplementation(
    async (stage: { document: DesignDocument }, doc: DesignDocument) => {
      expect(stage.document).toEqual(doc);
      return new Blob([JSON.stringify(doc)], { type: "image/png" });
    },
  );
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SlideEditor saves and exports", () => {
  it("contains the full slide in a tall mobile viewport at 100% zoom", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        private callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }

        observe() {
          this.callback(
            [{ contentRect: { width: 390, height: 844 } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        }

        disconnect() {}
      },
    );

    mount();

    await waitFor(() => expect(screen.getByTestId("design-stage")).toHaveStyle({ width: "390px" }));
  });

  it("keeps slide previews folded until the mobile toggle is opened", async () => {
    mount();
    await ready();
    const toggle = screen.getByRole("button", { name: "Show slide previews" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide slide previews" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("autosaves the open slide once editing pauses, in a single write", async () => {
    mount();
    await ready();
    edit("f");
    edit("fi");
    edit("final");
    expect(saves("a")).toBe(0);
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    await waitFor(() => expect(saves("a")).toBe(1), { timeout: AUTOSAVE_WAIT });
    expect(savedDesign("a")?.layers[0]).toMatchObject({ text: "final" });
    await screen.findByText("Saved");

    await act(() => new Promise((resolve) => setTimeout(resolve, 1200)));
    expect(saves("a")).toBe(1);
  });

  it("saves right away on Ctrl+S", async () => {
    mount();
    await ready();
    edit("now");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(saves("a")).toBe(1), { timeout: 300 });
  });

  it("warns before the page unloads only while edits are unsaved", async () => {
    mount();
    await ready();
    edit("pending");

    const leaving = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await screen.findByText("Saved");

    const leavingAgain = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leavingAgain);
    expect(leavingAgain.defaultPrevented).toBe(false);
  });

  it("saves pending edits when the editor unmounts", async () => {
    const { unmount } = mount();
    await ready();
    edit("leaving");
    unmount();
    await waitFor(() => expect(saves("a")).toBe(1));
    expect(savedDesign("a")?.layers[0]).toMatchObject({ text: "leaving" });
  });

  it.each([
    "thumbnail",
    "shortcut",
  ])("saves an outgoing draft before navigating by %s", async (via) => {
    mount();
    await ready();
    edit("keep my edits");
    if (via === "thumbnail") fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    else fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(text()).toBe("b"));
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).design.layers[0].text).toBe(
      "keep my edits",
    );
    fireEvent.click(screen.getByRole("button", { name: "Slide a" }));
    await waitFor(() => expect(text()).toBe("keep my edits"));
  });

  it("keeps a draft whose save failed, and saves it on the retry", async () => {
    mount();
    await ready();
    edit("unsaved");
    mocks.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Save failed" }), { status: 500 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(saves("a")).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Slide a" }));
    expect(text()).toBe("unsaved");

    fireEvent.click(screen.getByRole("button", { name: "Couldn't save — retry" }));
    await waitFor(() => expect(saves("a")).toBe(2));
    expect(savedDesign("a")?.layers[0]).toMatchObject({ text: "unsaved" });
    await screen.findByText("Saved");
  });

  it("keeps each slide's own history across a round trip", async () => {
    mount();
    await ready();
    edit("first pass");
    fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    await waitFor(() => expect(text()).toBe("b"));
    fireEvent.click(screen.getByRole("button", { name: "Slide a" }));
    expect(text()).toBe("first pass");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(text()).toBe("a");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(text()).toBe("first pass");
  });

  it("undoes a step taken on another slide, bringing that slide back up", async () => {
    mount();
    await ready();
    edit("edited on a");
    fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    await waitFor(() => expect(text()).toBe("b"));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: "Slide a" })).toHaveAttribute("aria-current", "true");
    expect(text()).toBe("a");
  });

  it.each([
    "Preview",
    "Complete post",
  ])("renders freshly saved first-slide edits for %s", async (action) => {
    mount();
    await ready();
    edit("latest first slide");
    fireEvent.click(screen.getByRole("button", { name: action }));
    await waitFor(() => expect(mocks.rasterize).toHaveBeenCalledTimes(2));
    expect(mocks.rasterize.mock.calls[0][1].layers[0].text).toBe("latest first slide");
    expect(mocks.rasterize.mock.calls[1][1].layers[0].text).toBe("b");
    if (action === "Preview") await screen.findByText("Preview ready");
    else await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("blocks edits, saves, navigation and export until layout corrections are persisted", async () => {
    const fonts = deferred<void>();
    const patch = deferred<Response>();
    mocks.fonts.mockReturnValue(fonts.promise);
    mocks.reflow.mockImplementation((doc: DesignDocument) => ({
      ...doc,
      layers: doc.layers.map((l) => ({ ...l, y: 80 })),
    }));
    mocks.fetch.mockReturnValue(patch.promise);
    mount();
    expect(screen.getByLabelText("Slide text").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete post" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    expect(text()).toBe("a");
    expect(mocks.fetch).not.toHaveBeenCalled();
    await act(async () => {
      fonts.resolve();
    });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Slide text").closest("[inert]")).not.toBeNull();
    await act(async () => {
      patch.resolve(new Response("{}"));
    });
    await ready();
    edit("after initialization");
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3), { timeout: AUTOSAVE_WAIT });
    expect(JSON.parse(mocks.fetch.mock.calls[2][1].body).design.layers[0]).toMatchObject({
      text: "after initialization",
      y: 80,
    });
  });

  it("highlights every slide from one checkbox, and takes them all back on undo", async () => {
    mount();
    await ready();
    const checkbox = screen.getByLabelText("Highlight text on every slide") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(true));
    expect(savedDesign("b")?.layers[0]).toHaveProperty("background.opacity", 0.5);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(checkbox.checked).toBe(false));
    expect(savedDesign("b")?.layers[0]).not.toHaveProperty("background");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(checkbox.checked).toBe(true));
    expect(savedDesign("b")?.layers[0]).toHaveProperty("background.opacity", 0.5);
  });

  it("undoes a carousel-wide highlight from another slide", async () => {
    mount();
    await ready();
    const checkbox = screen.getByLabelText("Highlight text on every slide") as HTMLInputElement;

    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Slide b" }));
    await waitFor(() => expect(text()).toBe("b"));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(checkbox.checked).toBe(false));
    expect(screen.getByRole("button", { name: "Slide a" })).toHaveAttribute("aria-current", "true");
    await waitFor(() => expect(savedDesign("b")?.layers[0]).not.toHaveProperty("background"));
  });

  it("aborts completion on image loading errors", async () => {
    mount();
    await ready();
    mocks.rasterize.mockRejectedValueOnce(new Error("A slide logo failed to load"));
    fireEvent.click(screen.getByRole("button", { name: "Complete post" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("A slide logo failed to load"));
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Complete post" })).toBeEnabled();
  });
});
