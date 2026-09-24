import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CarouselPreviewDialog,
  type PreviewSlide,
} from "@/components/posts/carousel/CarouselPreviewDialog";

const SLIDES: PreviewSlide[] = [
  { id: "a", order: 0, headline: "One", url: "blob:a" },
  { id: "b", order: 1, headline: "Two", url: "blob:b" },
  { id: "c", order: 2, headline: "Three", url: "blob:c" },
];

function renderDialog(props: Partial<React.ComponentProps<typeof CarouselPreviewDialog>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <CarouselPreviewDialog
      open
      onOpenChange={onOpenChange}
      slides={SLIDES}
      canvas={{ width: 1080, height: 1350 }}
      {...props}
    />,
  );
  return { onOpenChange };
}

function tap(element: Element, x = 300, y = 400) {
  fireEvent.pointerDown(element, { clientX: x, clientY: y });
  fireEvent.pointerUp(element, { clientX: x, clientY: y });
}

function actionsHidden(): boolean {
  return screen.getByTestId("preview-actions").className.includes("opacity-0");
}

/** The chrome shows itself once on open, so most cases start after that hint has passed. */
function afterHint() {
  act(() => void vi.advanceTimersByTime(1000));
}

function counter(): string {
  return screen.getByTestId("preview-counter").textContent ?? "";
}

/** Touch scrubbing reads the thumbnail under the finger, which jsdom cannot lay out. */
function pointAt(element: Element | null) {
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    writable: true,
    value: vi.fn(() => element),
  });
}

function thumb(n: number): HTMLElement {
  return screen.getByRole("button", { name: `Go to slide ${n}` });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(document, "elementFromPoint");
});

describe("CarouselPreviewDialog", () => {
  it("steps forward on ArrowRight", () => {
    renderDialog();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counter()).toContain("2 of 3");
  });

  it("wraps from the last slide to the first", () => {
    renderDialog();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counter()).toContain("3 of 3");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counter()).toContain("1 of 3");
  });

  it("wraps from the first slide to the last", () => {
    renderDialog();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(counter()).toContain("3 of 3");
  });

  it("keeps every slide mounted and slides the strip to the current one", () => {
    renderDialog();
    const track = screen.getByTestId("preview-track");
    expect(track.querySelectorAll("img")).toHaveLength(3);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(track.querySelectorAll("img")).toHaveLength(3);
    expect(track.style.transform).toBe("translateX(calc(-100% + 0px))");
  });

  it("steps once when the keypress bubbles out of the dialog to the window", () => {
    renderDialog();
    fireEvent.keyDown(screen.getByRole("button", { name: "Next slide" }), {
      key: "ArrowRight",
      bubbles: true,
    });
    expect(counter()).toContain("2 of 3");
  });

  it("steps forward on a left swipe and back on a right swipe", () => {
    renderDialog();
    const screenArea = screen.getByTestId("preview-screen");

    fireEvent.pointerDown(screenArea, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(screenArea, { clientX: 200, clientY: 410 });
    expect(counter()).toContain("2 of 3");

    fireEvent.pointerDown(screenArea, { clientX: 200, clientY: 400 });
    fireEvent.pointerUp(screenArea, { clientX: 300, clientY: 390 });
    expect(counter()).toContain("1 of 3");
  });

  it("ignores short and mostly vertical drags", () => {
    renderDialog();
    const screenArea = screen.getByTestId("preview-screen");

    fireEvent.pointerDown(screenArea, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(screenArea, { clientX: 280, clientY: 400 });
    fireEvent.pointerDown(screenArea, { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(screenArea, { clientX: 240, clientY: 520 });

    expect(counter()).toContain("1 of 3");
  });

  it("follows the pointer while dragging, without the snap transition", () => {
    renderDialog();
    const screenArea = screen.getByTestId("preview-screen");
    const track = screen.getByTestId("preview-track");

    fireEvent.pointerDown(screenArea, { clientX: 300, clientY: 400 });
    fireEvent.pointerMove(screenArea, { clientX: 240, clientY: 400, buttons: 1 });

    expect(track.style.transform).toBe("translateX(calc(0% + -60px))");
    expect(track.className).not.toContain("transition-transform");

    fireEvent.pointerUp(screenArea, { clientX: 240, clientY: 400 });
    expect(counter()).toContain("2 of 3");
    expect(track.className).toContain("transition-transform");
  });

  it("resists and stays put when swiping past the first slide", () => {
    renderDialog();
    const screenArea = screen.getByTestId("preview-screen");
    const track = screen.getByTestId("preview-track");

    fireEvent.pointerDown(screenArea, { clientX: 100, clientY: 400 });
    fireEvent.pointerMove(screenArea, { clientX: 250, clientY: 400, buttons: 1 });
    expect(track.style.transform).toBe("translateX(calc(0% + 50px))");

    fireEvent.pointerUp(screenArea, { clientX: 250, clientY: 400 });
    expect(counter()).toContain("1 of 3");
  });

  it("shows the phone actions briefly on open so the gesture is discoverable", () => {
    renderDialog({ onDone: vi.fn() });

    expect(actionsHidden()).toBe(false);

    afterHint();
    expect(actionsHidden()).toBe(true);
  });

  it("keeps the phone actions up when they are tapped during the opening hint", () => {
    renderDialog({ onDone: vi.fn() });

    act(() => void vi.advanceTimersByTime(600));
    tap(screen.getByTestId("preview-screen"));
    act(() => void vi.advanceTimersByTime(600));

    expect(actionsHidden()).toBe(true);

    tap(screen.getByTestId("preview-screen"));
    act(() => void vi.advanceTimersByTime(1000));
    expect(actionsHidden()).toBe(false);
  });

  it("stops the opening hint from hiding once a thumbnail is used", () => {
    renderDialog({ onDone: vi.fn() });

    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(thumb(2));
    afterHint();

    expect(counter()).toContain("2 of 3");
    expect(actionsHidden()).toBe(false);
  });

  it("stops the opening hint from hiding once the thumbnails are touched", () => {
    renderDialog({ onDone: vi.fn() });

    act(() => void vi.advanceTimersByTime(400));
    fireEvent.pointerDown(thumb(2), { pointerId: 1, clientX: 140, clientY: 500 });
    fireEvent.pointerUp(screen.getByTestId("preview-strip"), { pointerId: 1 });
    afterHint();

    expect(actionsHidden()).toBe(false);
  });

  it("reveals the phone actions on a tap and hides them on the next one", () => {
    const onDone = vi.fn();
    renderDialog({ onDone });
    const screenArea = screen.getByTestId("preview-screen");

    afterHint();
    expect(actionsHidden()).toBe(true);

    tap(screenArea);
    expect(actionsHidden()).toBe(false);

    tap(screenArea);
    expect(actionsHidden()).toBe(true);
  });

  it("hides the phone actions as soon as a swipe starts", () => {
    renderDialog({ onDone: vi.fn() });
    const screenArea = screen.getByTestId("preview-screen");

    afterHint();
    tap(screenArea);
    expect(actionsHidden()).toBe(false);

    fireEvent.pointerDown(screenArea, { clientX: 300, clientY: 400 });
    fireEvent.pointerMove(screenArea, { clientX: 240, clientY: 400, buttons: 1 });

    expect(actionsHidden()).toBe(true);
  });

  it("closes on Keep editing and finishes the post on Done", () => {
    const onDone = vi.fn();
    const { onOpenChange } = renderDialog({ onDone });

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("leaves the phone actions out when the preview cannot finish the post", () => {
    renderDialog();
    expect(screen.queryByTestId("preview-actions")).not.toBeInTheDocument();
  });

  it("selects the held thumbnail and then the one under the moving finger", () => {
    renderDialog({ onDone: vi.fn() });
    const strip = screen.getByTestId("preview-strip");

    fireEvent.pointerDown(thumb(2), { pointerId: 1, clientX: 140, clientY: 500 });
    expect(counter()).toContain("1 of 3");

    act(() => void vi.advanceTimersByTime(300));
    expect(counter()).toContain("2 of 3");

    pointAt(thumb(3));
    fireEvent.pointerMove(strip, { pointerId: 1, clientX: 200, clientY: 500 });
    expect(counter()).toContain("3 of 3");

    fireEvent.pointerUp(strip, { pointerId: 1, clientX: 200, clientY: 500 });
    fireEvent.click(thumb(2));
    expect(counter()).toContain("3 of 3");
  });

  it("leaves the selection alone when the thumbnails are dragged instead of held", () => {
    renderDialog({ onDone: vi.fn() });
    const strip = screen.getByTestId("preview-strip");

    fireEvent.pointerDown(thumb(2), { pointerId: 1, clientX: 140, clientY: 500 });
    fireEvent.pointerMove(strip, { pointerId: 1, clientX: 60, clientY: 500 });
    act(() => void vi.advanceTimersByTime(300));

    expect(counter()).toContain("1 of 3");
  });

  it("jumps to a slide from its thumbnail without hiding the chrome", () => {
    renderDialog({ onDone: vi.fn() });

    afterHint();
    tap(screen.getByTestId("preview-screen"));
    expect(actionsHidden()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));

    expect(counter()).toContain("3 of 3");
    expect(actionsHidden()).toBe(false);
  });
});
