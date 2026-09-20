import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CarouselPreviewDialog,
  type PreviewSlide,
} from "@/components/posts/carousel/CarouselPreviewDialog";

const SLIDES: PreviewSlide[] = [
  { id: "a", order: 0, headline: "One", url: "blob:a" },
  { id: "b", order: 1, headline: "Two", url: "blob:b" },
  { id: "c", order: 2, headline: "Three", url: "blob:c" },
];

function renderDialog() {
  return render(
    <CarouselPreviewDialog
      open
      onOpenChange={vi.fn()}
      slides={SLIDES}
      canvas={{ width: 1080, height: 1350 }}
    />,
  );
}

function counter(): string {
  return screen.getByTestId("preview-counter").textContent ?? "";
}

afterEach(cleanup);

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
});
