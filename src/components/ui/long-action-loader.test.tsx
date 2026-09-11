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
