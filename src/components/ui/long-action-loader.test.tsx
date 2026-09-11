import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatElapsedTime, LogoLoader, LongActionLoader } from "./long-action-loader";

afterEach(() => {
  cleanup();
});

describe("LogoLoader", () => {
  it("is an accessible standalone loading indicator with a configurable size", () => {
    render(<LogoLoader aria-label="Preparing preview" size="7rem" />);

    const loader = screen.getByRole("status");
    expect(loader).toHaveAttribute("aria-busy", "true");
    expect(loader).toHaveTextContent("Preparing preview");
    expect(loader).toHaveStyle({ "--logo-loader-size": "7rem" });
    expect(loader.querySelector("svg")).not.toBeNull();
  });

  it("drives the orbit from a sampled CSS linear() easing", () => {
    render(<LogoLoader aria-label="Preparing preview" />);

    const orbitEasing = screen
      .getByRole("status")
      .style.getPropertyValue("--logo-loader-orbit-ease");
    const points = orbitEasing.slice("linear(".length, -1).split(", ").map(Number);

    expect(points.length).toBeGreaterThan(100);
    expect(points.every((point) => Number.isFinite(point))).toBe(true);
    expect(points.at(0)).toBe(0);
    expect(points.at(-1)).toBe(1);
    // Monotonic, or the orbit would visibly reverse mid-loop.
    expect(points.every((point, i) => i === 0 || point >= (points[i - 1] ?? 0))).toBe(true);
  });
});

describe("LongActionLoader", () => {
  it("announces its status and supporting timing", () => {
    render(
      <LongActionLoader
        title="Generating your video…"
        description="Rendering the final frames"
        elapsedSeconds={65}
        estimate="Usually takes two minutes"
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Generating your video…");
    expect(status).toHaveTextContent("Rendering the final frames");
    expect(status).toHaveTextContent("1m 05s elapsed");
    expect(status).toHaveTextContent("Usually takes two minutes");
    expect(status.querySelector('[data-slot="logo-loader"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("formats elapsed time defensively", () => {
    expect(formatElapsedTime(-2)).toBe("0s");
    expect(formatElapsedTime(9.9)).toBe("9s");
    expect(formatElapsedTime(125)).toBe("2m 05s");
  });
});
