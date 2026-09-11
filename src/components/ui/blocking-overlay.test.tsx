import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockingOverlay } from "./blocking-overlay";

afterEach(() => {
  cleanup();
});

function pressKey(key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("BlockingOverlay", () => {
  it("announces the running operation with the shared long-action loader", () => {
    render(<BlockingOverlay active title="Rendering slides…" description="Slide 2 of 5" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("data-slot", "long-action-loader");
    expect(status).toHaveTextContent("Rendering slides…");
    expect(status).toHaveTextContent("Slide 2 of 5");
    expect(status).toHaveAttribute("data-size", "large");
    expect(status.querySelector('[data-slot="logo-loader"]')).toHaveStyle({
      "--logo-loader-size": "256px",
      "--logo-loader-stroke-scale": "3",
    });
  });

  it("swallows key events while active", () => {
    const listener = vi.fn();
    window.addEventListener("keydown", listener);

    const { rerender } = render(<BlockingOverlay active />);
    expect(pressKey("a").defaultPrevented).toBe(true);
    expect(listener).not.toHaveBeenCalled();

    rerender(<BlockingOverlay active={false} />);
    expect(pressKey("a").defaultPrevented).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("keydown", listener);
  });

  it("stays out of the way when inactive", () => {
    const { container } = render(<BlockingOverlay active={false} title="Rendering slides…" />);

    const overlay = container.querySelector('[data-slot="blocking-overlay"]');
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay).not.toHaveAttribute("data-active");
    expect(overlay?.className).toContain("pointer-events-none");
  });
});
