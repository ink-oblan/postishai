import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type DesignEditorState,
  type PageDocuments,
  useDesignEditor,
} from "@/components/design/useDesignEditor";
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

const SLIDE = "slide-a";
const OTHER = "slide-b";

const otherLayer: Layer = { ...layer, id: "layer-2", fill: "#0000ff" };
const otherInitial: DesignDocument = {
  background: { kind: "solid", color: "#222222" },
  layers: [otherLayer],
};

function setup(
  documents: PageDocuments = { [SLIDE]: initial, [OTHER]: otherInitial },
  pageId: string | null = SLIDE,
) {
  return renderHook(() => useDesignEditor({ documents, pageId }, spec));
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

  it("aligns a layer against the safe area", () => {
    const { result } = setup();

    act(() => result.current.alignLayer("layer-1", "left"));
    expect(result.current.document.layers[0].x).toBe(80);

    act(() => result.current.alignLayer("layer-1", "right"));
    expect(result.current.document.layers[0].x).toBe(700);

    act(() => result.current.alignLayer("layer-1", "centerX"));
    expect(result.current.document.layers[0].x).toBe(390);

    act(() => result.current.alignLayer("layer-1", "top"));
    expect(result.current.document.layers[0].y).toBe(100);

    act(() => result.current.alignLayer("layer-1", "bottom"));
    expect(result.current.document.layers[0].y).toBe(950);

    act(() => result.current.alignLayer("layer-1", "centerY"));
    expect(result.current.document.layers[0].y).toBe(525);
  });

  it("pastes a copied layer under a fresh id and selects it", () => {
    const { result } = setup();

    act(() => result.current.pasteLayer(layer));
    const [, pasted] = result.current.document.layers;
    expect(pasted.id).not.toBe("layer-1");
    expect(result.current.selectedId).toBe(pasted.id);

    act(() => result.current.pasteLayer(layer, { x: 10, y: 20 }));
    expect(result.current.document.layers[2]).toMatchObject({ x: 10, y: 20 });
  });

  it("steps a paste clear of whatever already sits at that spot", () => {
    const { result } = setup();

    // The source layer is still on this slide, so the copy cannot land on top of it.
    act(() => result.current.pasteLayer(layer));
    expect(result.current.document.layers[1]).toMatchObject({ x: 124, y: 224 });

    act(() => result.current.pasteLayer(layer));
    expect(result.current.document.layers[2]).toMatchObject({ x: 148, y: 248 });
  });

  it("pastes in place when the spot is free, as on another slide", () => {
    const { result } = setup({ [SLIDE]: { ...initial, layers: [] } });

    act(() => result.current.pasteLayer(layer));
    expect(result.current.document.layers[0]).toMatchObject({ x: 100, y: 200 });
  });

  describe("across slides", () => {
    it("keeps a slide's history when another one is opened and left again", () => {
      const { result } = setup();

      act(() => result.current.updateLayer("layer-1", { x: 500 }));
      act(() => result.current.openPage(OTHER));
      expect(result.current.document).toBe(otherInitial);
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.openPage(SLIDE));
      expect(result.current.document.layers[0].x).toBe(500);

      act(() => result.current.undo());
      expect(result.current.document.layers[0].x).toBe(100);
    });

    it("brings the slide a step was taken on back up when it is undone", () => {
      const { result } = setup();

      act(() => result.current.updateLayer("layer-1", { x: 500 }));
      act(() => result.current.openPage(OTHER));
      act(() => result.current.updateLayer("layer-2", { x: 700 }));
      act(() => result.current.openPage(SLIDE));

      act(() => result.current.undo());
      expect(result.current.pageId).toBe(OTHER);
      expect(result.current.documents[OTHER].layers[0].x).toBe(100);

      act(() => result.current.openPage(SLIDE));
      act(() => result.current.redo());
      expect(result.current.pageId).toBe(OTHER);
      expect(result.current.documents[OTHER].layers[0].x).toBe(700);
    });

    const restyled: PageDocuments = {
      [SLIDE]: { ...initial, layers: [{ ...layer, fill: "#00ff00" }] },
      [OTHER]: { ...otherInitial, layers: [{ ...otherLayer, fill: "#00ff00" }] },
    };

    it("takes every slide back through a carousel-wide restyle in one step", () => {
      const { result } = setup();

      act(() => result.current.restylePages(restyled));
      act(() => result.current.openPage(OTHER));
      act(() => result.current.updateLayer("layer-2", { x: 700 }));

      act(() => result.current.undo());
      act(() => result.current.undo());
      expect(result.current.documents[SLIDE]).toBe(initial);
      expect(result.current.documents[OTHER]).toBe(otherInitial);
      expect(result.current.pageId).toBe(SLIDE);

      act(() => result.current.redo());
      expect(result.current.documents[OTHER].layers[0]).toMatchObject({ fill: "#00ff00" });
      expect(result.current.canUndo).toBe(true);
    });

    it("leaves a restyle that changes nothing out of the history", () => {
      const { result } = setup();

      act(() => result.current.restylePages({ [SLIDE]: initial, [OTHER]: otherInitial }));

      expect(result.current.canUndo).toBe(false);
      expect(result.current.dirty).toBe(false);
    });

    it("tracks the slides waiting to be written back", () => {
      const { result } = setup();

      act(() => result.current.updateLayer("layer-1", { x: 500 }));
      expect(result.current.dirtyPageIds).toEqual([SLIDE]);

      act(() => result.current.restylePages(restyled));
      expect(result.current.dirtyPageIds).toEqual([SLIDE, OTHER]);

      act(() => result.current.markSaved(result.current.documents));
      expect(result.current.dirtyPageIds).toEqual([]);
      expect(result.current.dirty).toBe(false);

      act(() => result.current.undo());
      expect(result.current.dirtyPageIds).toEqual([SLIDE, OTHER]);
    });

    it("keeps a stale save from clearing an edit made while it was in flight", () => {
      const { result } = setup();

      act(() => result.current.updateLayer("layer-1", { x: 500 }));
      const inFlight = result.current.documents;
      act(() => result.current.updateLayer("layer-1", { x: 700 }));

      act(() => result.current.markSaved(inFlight));
      expect(result.current.dirtyPageIds).toEqual([SLIDE]);
    });
  });

  describe("autoLayout", () => {
    const stacked: DesignDocument = { ...initial, autoLayout: { anchor: "middle", gap: 40 } };
    const withStack = () => setup({ [SLIDE]: stacked });

    it("keeps the automatic stacking through a restyle", () => {
      const { result } = withStack();

      act(() => result.current.updateLayer("layer-1", { fill: "#00ff00" }));

      expect(result.current.document.autoLayout).toEqual({ anchor: "middle", gap: 40 });
    });

    const handovers: Record<string, (editor: DesignEditorState) => void> = {
      "a drag": (editor) => editor.updateLayer("layer-1", { x: 500 }),
      "a resize": (editor) => editor.updateLayer("layer-1", { height: 500 }),
      "a nudge": (editor) => editor.nudgeLayer("layer-1", 0, 4),
      "an align": (editor) => editor.alignLayer("layer-1", "top"),
      "a new layer": (editor) => editor.addShapeLayer("#000000"),
      "a deletion": (editor) => editor.deleteLayer("layer-1"),
    };

    it.each(Object.entries(handovers))("hands the layout over after %s", (_label, edit) => {
      const { result } = withStack();

      act(() => edit(result.current));

      expect(result.current.document.autoLayout).toBeUndefined();
    });

    it("restacks without touching the history or the dirty flag", () => {
      const { result } = withStack();

      act(() =>
        result.current.applyReflow({ [SLIDE]: { ...stacked, layers: [{ ...layer, y: 400 }] } }),
      );

      expect(result.current.document.layers[0].y).toBe(400);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.dirty).toBe(false);
    });
  });
});
