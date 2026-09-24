import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, StrictMode, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignEditor } from "@/components/design/DesignEditor";
import type { DesignEditorHandle, EditorPage } from "@/components/design/design-editor-contract";
import type { DesignDocument, Layer } from "@/lib/design/document";

const mocks = vi.hoisted(() => ({
  rasterize: vi.fn(),
  waitForBackground: vi.fn(),
}));

vi.mock("next/dynamic", () => ({ default: () => TestStage }));
vi.mock("@/lib/design/fonts", async (original) => ({
  ...(await original<object>()),
  ensureFontsLoaded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/design/measure-text", () => ({ textMeasurer: () => vi.fn() }));
vi.mock("@/lib/design/reflow", () => ({ reflowAutoLayout: () => null }));
vi.mock("@/components/design/rasterize", () => ({
  rasterizeStage: mocks.rasterize,
  waitForBackground: mocks.waitForBackground,
}));
vi.mock("@/components/design/LayerInspector", () => ({ LayerInspector: () => null }));
vi.mock("@/components/design/ShortcutDialog", () => ({ ShortcutDialog: () => null }));
vi.mock("@/components/design/sample-background", () => ({
  sampleBackgroundRegion: vi.fn().mockResolvedValue({ r: 200, g: 200, b: 200 }),
}));

/** Keeps the editor hook and keyboard handlers real; replaces only the canvas boundary. */
function TestStage({
  document,
  backgroundUrl,
  stageRef,
  onLayerChange,
}: {
  document: DesignDocument;
  backgroundUrl: string | null;
  stageRef: { current: unknown };
  onLayerChange: (id: string, patch: Partial<Layer>) => void;
}) {
  useLayoutEffect(() => {
    stageRef.current = { document };
  }, [document, stageRef]);
  const layer = document.layers[0];
  return (
    <>
      <span data-testid="background">{backgroundUrl ?? "none"}</span>
      <input
        aria-label="Page text"
        value={layer?.type === "text" ? layer.text : ""}
        onChange={(event) => onLayerChange(layer.id, { text: event.target.value })}
      />
    </>
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

const SPEC = {
  width: 1080,
  height: 1350,
  safeZone: { top: 50, right: 50, bottom: 200, left: 50 },
};
const AUTOSAVE_WAIT = 2000;

function mount(
  overrides: {
    pages?: EditorPage[];
    savePage?: (pageId: string, doc: DesignDocument) => Promise<void>;
    onError?: (error: unknown, kind: string) => void;
    withStrip?: boolean;
  } = {},
) {
  const pages = overrides.pages ?? [
    { id: "a", backgroundUrl: "/a.png" },
    { id: "b", backgroundUrl: "/b.png" },
  ];
  const savePage = overrides.savePage ?? vi.fn().mockResolvedValue(undefined);
  const ref = createRef<DesignEditorHandle | null>() as React.RefObject<DesignEditorHandle | null>;

  const view = render(
    <StrictMode>
      <DesignEditor
        pages={pages}
        initialDocuments={Object.fromEntries(pages.map((page) => [page.id, document(page.id)]))}
        spec={SPEC}
        ref={ref}
        assets={{ fonts: [], resolveFontFamily: (name) => name, assetUrl: (id) => `/assets/${id}` }}
        persistence={{ savePage, autosaveDelayMs: 10 }}
        onError={overrides.onError ?? vi.fn()}
        renderHeader={({ save }) => <span>save:{save.state}</span>}
        renderPageStrip={
          overrides.withStrip === false
            ? undefined
            : ({ pageIds, displayPageId, openPage }) => (
                <nav>
                  {pageIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-current={displayPageId === id}
                      onClick={() => openPage(id)}
                    >
                      Page {id}
                    </button>
                  ))}
                </nav>
              )
        }
      />
    </StrictMode>,
  );

  return { ...view, ref, savePage, pages };
}

/** The startup reflow blocks the editor; the overlay's title is what says it is still running. */
async function ready() {
  await screen.findByLabelText("Page text");
  await waitFor(() => expect(screen.queryByText(/Preparing page layouts/)).not.toBeInTheDocument());
}

beforeEach(() => {
  mocks.rasterize.mockReset().mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  mocks.waitForBackground.mockReset().mockResolvedValue(undefined);
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DesignEditor", () => {
  it("does not dirty a page when the host swaps its background", async () => {
    const savePage = vi.fn().mockResolvedValue(undefined);
    const { rerender } = mount({ savePage });

    await waitFor(() => expect(screen.getByTestId("background")).toHaveTextContent("/a.png"));

    rerender(
      <StrictMode>
        <DesignEditor
          pages={[
            { id: "a", backgroundUrl: "/a.png?t=2" },
            { id: "b", backgroundUrl: "/b.png" },
          ]}
          initialDocuments={{ a: document("a"), b: document("b") }}
          spec={SPEC}
          assets={{
            fonts: [],
            resolveFontFamily: (name) => name,
            assetUrl: (id) => `/assets/${id}`,
          }}
          persistence={{ savePage, autosaveDelayMs: 10 }}
          onError={vi.fn()}
          renderHeader={({ save }) => <span>save:{save.state}</span>}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("background")).toHaveTextContent("/a.png?t=2"));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(savePage).not.toHaveBeenCalled();
    expect(screen.getAllByText("save:saved").length).toBeGreaterThan(0);
  });

  it("autosaves an edited page once the quiet period passes", async () => {
    const savePage = vi.fn().mockResolvedValue(undefined);
    mount({ savePage });

    const input = await screen.findByLabelText("Page text");
    fireEvent.change(input, { target: { value: "edited" } });

    await waitFor(
      () => {
        expect(savePage).toHaveBeenCalledWith(
          "a",
          expect.objectContaining({ layers: [expect.objectContaining({ text: "edited" })] }),
        );
      },
      { timeout: AUTOSAVE_WAIT },
    );
  });

  it("reports a failed write as a save error and offers a retry", async () => {
    const onError = vi.fn();
    const savePage = vi.fn().mockRejectedValue(new Error("nope"));
    mount({ savePage, onError });

    const input = await screen.findByLabelText("Page text");
    fireEvent.change(input, { target: { value: "edited" } });

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error), "save"), {
      timeout: AUTOSAVE_WAIT,
    });
    expect(screen.getAllByText("save:failed").length).toBeGreaterThan(0);
  });

  it("exports every page in order and reopens the page the user was on", async () => {
    const { ref } = mount();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Page b" }));
    await waitFor(() => expect(screen.getByTestId("background")).toHaveTextContent("/b.png"));

    const rendered = await act(async () => ref.current?.exportPages());

    expect(rendered?.map((page) => page.pageId)).toEqual(["a", "b"]);
    await waitFor(() => expect(screen.getByTestId("background")).toHaveTextContent("/b.png"));
  });

  it("exports the document as edited, not as mounted", async () => {
    const { ref } = mount();
    await ready();
    fireEvent.change(screen.getByLabelText("Page text"), { target: { value: "fresh" } });

    await act(async () => ref.current?.exportPages());

    const [firstCall] = mocks.rasterize.mock.calls;
    expect(firstCall[1].layers[0].text).toBe("fresh");
  });

  it("refuses a second export while one is already running", async () => {
    const { ref } = mount();
    await ready();

    const results = await act(async () =>
      Promise.all([ref.current?.exportPages(), ref.current?.exportPages()]),
    );

    expect(results.filter((result) => result !== null)).toHaveLength(1);
  });

  it("drops the page strip and its drawer when no strip is rendered", async () => {
    mount({ withStrip: false, pages: [{ id: "only", backgroundUrl: "/only.png" }] });
    await ready();

    expect(screen.queryByRole("button", { name: /previews/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Page / })).not.toBeInTheDocument();
  });

  it("leaves arrow keys alone when there is only one page", async () => {
    mount({ withStrip: false, pages: [{ id: "only", backgroundUrl: "/only.png" }] });
    await ready();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByTestId("background")).toHaveTextContent("/only.png"));
  });
});
