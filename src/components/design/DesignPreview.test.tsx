import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignPreview } from "@/components/design/DesignPreview";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument, TextLayer } from "@/lib/design/document";

afterEach(cleanup);

const SPEC: CanvasSpec = {
  width: 1080,
  height: 1350,
  safeZone: { top: 50, right: 50, bottom: 200, left: 50 },
};

function text(id: string, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id,
    type: "text",
    x: 50,
    y: 120,
    width: 980,
    height: 200,
    rotation: 0,
    text: `copy ${id}`,
    role: "heading",
    fontFamily: "Inter",
    fontSize: 96,
    fontWeight: 700,
    italic: false,
    underline: false,
    lineThrough: false,
    lineHeight: 1.2,
    align: "left",
    color: "#ffffff",
    ...overrides,
  };
}

function document(layers: TextLayer[]): DesignDocument {
  return { background: { kind: "solid", color: "#123456" }, layers };
}

describe("DesignPreview", () => {
  it("draws every text layer at its document coordinates", () => {
    render(
      <DesignPreview
        document={document([text("heading"), text("body", { y: 400, role: "body" })])}
        spec={SPEC}
        width={270}
      />,
    );

    const blocks = screen.getAllByTestId("preview-text");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].style.top).toBe("120px");
    expect(blocks[0].style.left).toBe("50px");
    expect(blocks[0].style.width).toBe("980px");
    expect(blocks[1].style.top).toBe("400px");
  });

  /** The frame is what carries the scale, so the layers stay in plain design pixels. */
  it("scales the whole frame rather than each layer", () => {
    const { container } = render(
      <DesignPreview document={document([text("heading")])} spec={SPEC} width={270} />,
    );

    const frame = container.querySelector<HTMLElement>("[style*='scale']");
    expect(frame?.style.transform).toBe("scale(0.25)");
    expect(frame?.style.width).toBe("1080px");
    expect(frame?.style.height).toBe("1350px");
  });

  it("keeps the aspect ratio of the canvas", () => {
    const { container } = render(<DesignPreview document={document([])} spec={SPEC} width={270} />);

    const outer = container.firstElementChild as HTMLElement;
    expect(outer.style.width).toBe("270px");
    expect(outer.style.height).toBe("338px");
  });

  it("puts a plate behind the copy, padded outwards", () => {
    render(
      <DesignPreview
        document={document([
          text("heading", {
            background: { color: "#000000", opacity: 0.7, padding: 16, cornerRadius: 0 },
          }),
        ])}
        spec={SPEC}
        width={270}
      />,
    );

    const plate = screen.getByTestId("preview-plate");
    expect(plate.style.inset).toBe("-16px");
    expect(plate.style.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(plate.style.opacity).toBe("0.7");
  });

  it("leaves the plate off a layer that has none", () => {
    render(<DesignPreview document={document([text("heading")])} spec={SPEC} width={270} />);

    expect(screen.queryByTestId("preview-plate")).toBeNull();
  });

  it("resolves the stored font name to a drawable family", () => {
    render(
      <DesignPreview
        document={document([
          text("heading", {
            fontFamily: "Playfair Display",
            background: { color: "#000000", opacity: 0.7, padding: 16, cornerRadius: 0 },
          }),
        ])}
        spec={SPEC}
        width={270}
        resolveFontFamily={(name) => `resolved-${name}`}
      />,
    );

    const copy = screen.getByTestId("preview-copy");
    expect(copy.style.fontFamily).toContain("resolved-Playfair Display");
    expect(copy.style.fontSize).toBe("96px");
    expect(copy.textContent).toBe("copy heading");
  });

  /** Plate first, copy after: the copy has to paint over the band that makes it readable. */
  it("paints the copy over its plate", () => {
    render(
      <DesignPreview
        document={document([
          text("heading", {
            background: { color: "#000000", opacity: 0.7, padding: 16, cornerRadius: 0 },
          }),
        ])}
        spec={SPEC}
        width={270}
      />,
    );

    const block = screen.getByTestId("preview-text");
    expect(block.children[0]).toBe(screen.getByTestId("preview-plate"));
    expect(block.children[1]).toBe(screen.getByTestId("preview-copy"));
    expect(screen.getByTestId("preview-copy").style.position).toBe("relative");
  });
});
