import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDesignEditor } from "@/components/design/useDesignEditor";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument, Layer } from "@/lib/design/document";

const spec: CanvasSpec = {
  width: 1080,
  height: 1350,
  safeZone: { top: 100, right: 80, bottom: 100, left: 80 },
};

const layer: Layer = {
  id: "layer-1",
  type: "shape",
  x: 100,
  y: 200,
  width: 300,
  height: 300,
  rotation: 0,
  fill: "#ff0000",
  cornerRadius: 0,
  opacity: 1,
};

const initial: DesignDocument = {
  background: { kind: "solid", color: "#111111" },
  layers: [layer],
};

function setup() {
  return renderHook(() => useDesignEditor(initial, spec));
}

describe("useDesignEditor", () => {
  it("walks back and forward through the history", () => {
    const { result } = setup();

    act(() => result.current.updateLayer("layer-1", { x: 500 }));
    act(() => result.current.updateLayer("layer-1", { x: 700 }));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(result.current.document.layers[0].x).toBe(500);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.document.layers[0].x).toBe(100);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    act(() => result.current.redo());
    expect(result.current.document.layers[0].x).toBe(700);
    expect(result.current.canRedo).toBe(false);
  });

  it("drops the redo stack once a new change lands", () => {
    const { result } = setup();

    act(() => result.current.updateLayer("layer-1", { x: 500 }));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.updateLayer("layer-1", { y: 900 }));
    expect(result.current.canRedo).toBe(false);
  });

  it("folds a run of nudges into one undo step", () => {
    const { result } = setup();

    act(() => result.current.nudgeLayer("layer-1", 4, 0));
    act(() => result.current.nudgeLayer("layer-1", 4, 0));
    act(() => result.current.nudgeLayer("layer-1", 4, 0));
    expect(result.current.document.layers[0].x).toBe(112);

    act(() => result.current.undo());
    expect(result.current.document.layers[0].x).toBe(100);
    expect(result.current.canUndo).toBe(false);
  });

  it("starts a fresh undo step after a nudge run ends", () => {
    const { result } = setup();

    act(() => result.current.nudgeLayer("layer-1", 4, 0));
    act(() => result.current.endGesture());
    act(() => result.current.nudgeLayer("layer-1", 40, 0));
    expect(result.current.document.layers[0].x).toBe(144);

    act(() => result.current.undo());
    expect(result.current.document.layers[0].x).toBe(104);
  });

  it("duplicates a layer above the original and selects the copy", () => {
    const { result } = setup();

    act(() => result.current.select("layer-1"));
    act(() => result.current.duplicateLayer("layer-1"));

    const [original, copy] = result.current.document.layers;
    expect(original.id).toBe("layer-1");
    expect(copy.id).not.toBe("layer-1");
    expect(copy).toMatchObject({ x: 124, y: 224, type: "shape" });
    expect(result.current.selectedId).toBe(copy.id);
  });

  it("clears the history when a new slide document is loaded", () => {
    const { result } = setup();

    act(() => result.current.updateLayer("layer-1", { x: 500 }));
    act(() => result.current.undo());
    act(() =>
      result.current.setDocument(
        { background: { kind: "solid", color: "#000000" }, layers: [] },
        { markClean: true },
      ),
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.dirty).toBe(false);
  });
});
