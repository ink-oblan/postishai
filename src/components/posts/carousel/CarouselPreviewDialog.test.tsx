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

  it("steps once when the keypress bubbles out of the dialog to the window", () => {
    renderDialog();
    fireEvent.keyDown(screen.getByRole("button", { name: "Next slide" }), {
      key: "ArrowRight",
      bubbles: true,
    });
    expect(counter()).toContain("2 of 3");
  });
});
