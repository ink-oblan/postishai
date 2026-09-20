import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Layer, TextLayer } from "@/lib/design/document";
import { MobileEditorToolbar } from "./MobileEditorToolbar";

const textLayer: TextLayer = {
  id: "text",
  type: "text",
  x: 20,
  y: 20,
  width: 500,
  height: 100,
  rotation: 0,
  text: "Hello",
  role: "body",
  fontFamily: "Inter",
  fontSize: 48,
  fontWeight: 400,
  italic: false,
  underline: false,
  lineThrough: false,
  lineHeight: 1.2,
  align: "left",
  color: "#ffffff",
};

function toolbar(layer: Layer | null = null, zoom = 1) {
  const handlers = {
    onAddText: vi.fn(),
    onAddShape: vi.fn(),
    onAddLogo: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onResetZoom: vi.fn(),
    onChange: vi.fn(),
    onToggleHighlight: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onRaise: vi.fn(),
    onLower: vi.fn(),
    onDeselect: vi.fn(),
    onOpenDetails: vi.fn(),
  };
  render(
    <MobileEditorToolbar
      layer={layer}
      busy={false}
      canUndo={true}
      canRedo={false}
      zoom={zoom}
      canAddLogo={true}
      {...handlers}
    />,
  );
  return handlers;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementFromPoint");
});

describe("MobileEditorToolbar", () => {
  it("shows creation tools until a layer is selected", () => {
    const handlers = toolbar();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(handlers.onAddText).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Shape" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows only a reset action while the viewport is away from normal zoom", () => {
    const normal = toolbar();
    expect(
      screen.queryByRole("button", { name: /Return to original view/ }),
    ).not.toBeInTheDocument();
    normal.onResetZoom.mockClear();

    cleanup();
    const zoomed = toolbar(null, 1.25);
    fireEvent.click(
      screen.getByRole("button", { name: /Return to original view, currently 125%/ }),
    );
    expect(zoomed.onResetZoom).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Zoom in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zoom out" })).not.toBeInTheDocument();
  });

  it("adapts the rail to a selected text layer", () => {
    const handlers = toolbar(textLayer);

    expect(screen.getByRole("toolbar", { name: "text tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Style/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Larger" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlight" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Larger" }));
    expect(handlers.onChange).toHaveBeenCalledWith({ fontSize: 52 });
  });

  it("uses a tap on Style as the quick bold toggle", () => {
    const handlers = toolbar(textLayer);

    fireEvent.click(screen.getByRole("button", { name: /Style/ }));
    expect(handlers.onChange).toHaveBeenCalledWith({ fontWeight: 700 });
  });

  it("opens the vertical style rail on hold and applies the dragged-to option", () => {
    vi.useFakeTimers();
    const handlers = toolbar(textLayer);
    const trigger = screen.getByRole("button", { name: /Style/ });

    fireEvent.pointerDown(trigger, { pointerType: "mouse", pointerId: 1 });
    act(() => vi.advanceTimersByTime(300));

    const underline = screen.getByRole("menuitemcheckbox", { name: "Underline" });
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => underline),
    });
    fireEvent.pointerMove(trigger, {
      pointerType: "mouse",
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(trigger, { pointerType: "mouse", pointerId: 1 });

    expect(handlers.onChange).toHaveBeenCalledWith({ underline: true });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
