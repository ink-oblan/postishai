import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesignEditorState } from "@/components/design/useDesignEditor";
import {
  NUDGE_STEP,
  NUDGE_STEP_COARSE,
  useEditorShortcuts,
} from "@/components/design/useEditorShortcuts";
import type { Layer } from "@/lib/design/document";

const TEXT_LAYER: Layer = {
  id: "layer-1",
  type: "text",
  x: 60,
  y: 120,
  width: 400,
  height: 90,
  rotation: 0,
  text: "Hook",
  role: "heading",
  fontFamily: "Inter",
  fontSize: 64,
  fontWeight: 700,
  italic: false,
  underline: false,
  lineThrough: false,
  lineHeight: 1.12,
  align: "left",
  color: "#ffffff",
};

function editorStub(selectedId: string | null = "layer-1"): DesignEditorState {
  return {
    document: { background: { kind: "solid", color: "#111111" }, layers: [TEXT_LAYER] },
    selectedId,
    dirty: false,
    canUndo: true,
    canRedo: true,
    select: vi.fn(),
    updateLayer: vi.fn(),
    commitLayer: vi.fn(),
    nudgeLayer: vi.fn(),
    endGesture: vi.fn(),
    addTextLayer: vi.fn(),
    addShapeLayer: vi.fn(),
    addLogoLayer: vi.fn(),
    pasteLayer: vi.fn(),
    alignLayer: vi.fn(),
    duplicateLayer: vi.fn(),
    deleteLayer: vi.fn(),
    raiseLayer: vi.fn(),
    lowerLayer: vi.fn(),
    setDocument: vi.fn(),
    applyReflow: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    markClean: vi.fn(),
  };
}

function press(init: KeyboardEventInit & { key: string }, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

// Vitest runs without globals here, so the library's auto-cleanup never registers and a
// previous test's listener would keep answering key presses.
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useEditorShortcuts", () => {
  it("undoes and redoes with the platform modifier", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "z", ctrlKey: true });
    expect(editor.undo).toHaveBeenCalledTimes(1);

    press({ key: "Z", ctrlKey: true, shiftKey: true });
    expect(editor.redo).toHaveBeenCalledTimes(1);

    press({ key: "z", metaKey: true });
    expect(editor.undo).toHaveBeenCalledTimes(2);

    press({ key: "y", ctrlKey: true });
    expect(editor.redo).toHaveBeenCalledTimes(2);
  });

  it("nudges the selection with the arrow keys", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "ArrowLeft" });
    expect(editor.nudgeLayer).toHaveBeenCalledWith("layer-1", -NUDGE_STEP, 0);

    press({ key: "ArrowDown", shiftKey: true });
    expect(editor.nudgeLayer).toHaveBeenCalledWith("layer-1", 0, NUDGE_STEP_COARSE);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown" }));
    expect(editor.endGesture).toHaveBeenCalledTimes(1);
  });

  it("stops the page from scrolling on an arrow press", () => {
    renderHook(() => useEditorShortcuts(editorStub()));

    expect(press({ key: "ArrowUp" }).defaultPrevented).toBe(true);
  });

  it("duplicates, reorders, deletes and deselects", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "d", ctrlKey: true });
    expect(editor.duplicateLayer).toHaveBeenCalledWith("layer-1");

    press({ key: "]", ctrlKey: true });
    expect(editor.raiseLayer).toHaveBeenCalledWith("layer-1");

    press({ key: "[", ctrlKey: true });
    expect(editor.lowerLayer).toHaveBeenCalledWith("layer-1");

    press({ key: "Delete" });
    press({ key: "Backspace" });
    expect(editor.deleteLayer).toHaveBeenCalledTimes(2);

    press({ key: "Escape" });
    expect(editor.select).toHaveBeenCalledWith(null);
  });

  it("saves on the modifier key instead of the browser dialog", () => {
    const editor = editorStub();
    const onSave = vi.fn();
    renderHook(() => useEditorShortcuts(editor, { onSave }));

    expect(press({ key: "s", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("leaves layer-free shortcuts alone when nothing is selected", () => {
    const editor = editorStub(null);
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "ArrowLeft" });
    press({ key: "Delete" });
    press({ key: "d", ctrlKey: true });

    expect(editor.nudgeLayer).not.toHaveBeenCalled();
    expect(editor.deleteLayer).not.toHaveBeenCalled();
    expect(editor.duplicateLayer).not.toHaveBeenCalled();
  });

  it("keeps a supported binding off the browser even when it does nothing", () => {
    const editor = editorStub(null);
    renderHook(() => useEditorShortcuts(editor));

    for (const key of ["b", "i", "u", "d", "c", "x", "v", "[", "]"]) {
      expect(press({ key, ctrlKey: true }).defaultPrevented).toBe(true);
    }
    expect(press({ key: "x", ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: "å", code: "KeyA", altKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: "Backspace" }).defaultPrevented).toBe(true);
  });

  it("leaves bindings it does not support to the browser", () => {
    renderHook(() => useEditorShortcuts(editorStub()));

    for (const key of ["r", "t", "w", "l", "n", "f", "p"]) {
      expect(press({ key, ctrlKey: true }).defaultPrevented).toBe(false);
    }
    expect(press({ key: "F5" }).defaultPrevented).toBe(false);
    expect(
      press({ key: "ArrowRight", code: "ArrowRight", ctrlKey: true, altKey: true })
        .defaultPrevented,
    ).toBe(false);
  });

  it("swallows the browser-only bindings inside a field without acting on them", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    const input = document.createElement("input");
    document.body.append(input);

    for (const key of ["b", "d", "i", "u", "s", "[", "]"]) {
      expect(press({ key, ctrlKey: true }, input).defaultPrevented).toBe(true);
    }
    expect(editor.updateLayer).not.toHaveBeenCalled();
    expect(editor.duplicateLayer).not.toHaveBeenCalled();
    expect(editor.raiseLayer).not.toHaveBeenCalled();
  });

  it("still swallows the browser-only bindings while disabled", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor, { enabled: false }));

    expect(press({ key: "b", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: "s", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(editor.updateLayer).not.toHaveBeenCalled();

    expect(press({ key: "ArrowRight" }).defaultPrevented).toBe(false);
    expect(press({ key: "z", ctrlKey: true }).defaultPrevented).toBe(false);
    expect(editor.nudgeLayer).not.toHaveBeenCalled();
    expect(editor.undo).not.toHaveBeenCalled();
  });

  it("leaves a field's own editing keys to the field", () => {
    renderHook(() => useEditorShortcuts(editorStub()));

    const input = document.createElement("input");
    document.body.append(input);

    for (const key of ["c", "x", "v", "z", "y", "a"]) {
      expect(press({ key, ctrlKey: true }, input).defaultPrevented).toBe(false);
    }
    expect(press({ key: "ArrowLeft" }, input).defaultPrevented).toBe(false);
    expect(press({ key: "Backspace" }, input).defaultPrevented).toBe(false);
  });

  it("matches the modifier bindings by physical key under a non-Latin layout", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    expect(press({ key: "и", code: "KeyB", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(editor.updateLayer).toHaveBeenCalledWith("layer-1", { fontWeight: 400 });

    expect(press({ key: "я", code: "KeyZ", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(editor.undo).toHaveBeenCalledTimes(1);
  });

  it("steps through the slides only while nothing is selected", () => {
    const onNextSlide = vi.fn();
    const onPreviousSlide = vi.fn();
    const { unmount } = renderHook(() =>
      useEditorShortcuts(editorStub(null), { onNextSlide, onPreviousSlide }),
    );

    expect(press({ key: "ArrowRight" }).defaultPrevented).toBe(true);
    press({ key: " " });
    expect(onNextSlide).toHaveBeenCalledTimes(2);

    press({ key: "ArrowLeft" });
    expect(onPreviousSlide).toHaveBeenCalledTimes(1);

    unmount();
    renderHook(() => useEditorShortcuts(editorStub(), { onNextSlide, onPreviousSlide }));

    press({ key: "ArrowRight" });
    press({ key: " " });
    expect(onNextSlide).toHaveBeenCalledTimes(2);
  });

  it("leaves a focused button to handle its own space press", () => {
    const onNextSlide = vi.fn();
    renderHook(() => useEditorShortcuts(editorStub(null), { onNextSlide }));

    const button = document.createElement("button");
    document.body.append(button);

    press({ key: " " }, button);
    expect(onNextSlide).not.toHaveBeenCalled();
  });

  it("ignores keys typed into a field", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    const input = document.createElement("textarea");
    document.body.append(input);

    press({ key: "ArrowLeft" }, input);
    press({ key: "Delete" }, input);
    press({ key: "z", ctrlKey: true }, input);

    expect(editor.nudgeLayer).not.toHaveBeenCalled();
    expect(editor.deleteLayer).not.toHaveBeenCalled();
    expect(editor.undo).not.toHaveBeenCalled();
  });

  it("aligns the selection to the safe area on the Alt bindings", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    // `code` is what the hook reads, since Alt+A reports "å" on macOS.
    press({ key: "å", code: "KeyA", altKey: true });
    expect(editor.alignLayer).toHaveBeenCalledWith("layer-1", "left");

    press({ key: "√", code: "KeyV", altKey: true });
    expect(editor.alignLayer).toHaveBeenCalledWith("layer-1", "centerY");
  });

  it("does not nudge when Alt rides along with the modifier", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "ArrowRight", code: "ArrowRight", ctrlKey: true, altKey: true });
    expect(editor.nudgeLayer).not.toHaveBeenCalled();
  });

  it("copies a layer and pastes it in place, or over the selection", () => {
    const editor = editorStub();
    const { unmount } = renderHook(() => useEditorShortcuts(editor));

    expect(press({ key: "c", ctrlKey: true }).defaultPrevented).toBe(true);
    unmount();

    // A fresh editor stands in for a different slide: the clipboard has to outlive the document.
    const other = editorStub(null);
    renderHook(() => useEditorShortcuts(other));

    press({ key: "v", ctrlKey: true });
    expect(other.pasteLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "layer-1" }),
      undefined,
    );

    press({ key: "v", ctrlKey: true, shiftKey: true });
    expect(other.pasteLayer).toHaveBeenLastCalledWith(expect.anything(), undefined);
  });

  it("pastes over the selected layer's position with Shift", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "c", ctrlKey: true });
    press({ key: "v", ctrlKey: true, shiftKey: true });

    expect(editor.pasteLayer).toHaveBeenLastCalledWith(expect.anything(), {
      x: TEXT_LAYER.x,
      y: TEXT_LAYER.y,
    });
  });

  it("cuts a layer to the clipboard", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "x", ctrlKey: true });
    expect(editor.deleteLayer).toHaveBeenCalledWith("layer-1");
  });

  it("toggles the text decorations on the modifier bindings", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "i", ctrlKey: true });
    expect(editor.updateLayer).toHaveBeenCalledWith("layer-1", { italic: true });

    press({ key: "u", ctrlKey: true });
    expect(editor.updateLayer).toHaveBeenCalledWith("layer-1", { underline: true });

    press({ key: "X", shiftKey: true, ctrlKey: true });
    expect(editor.updateLayer).toHaveBeenCalledWith("layer-1", { lineThrough: true });

    // Strikethrough shares a key with cut, which must not fire alongside it.
    expect(editor.deleteLayer).not.toHaveBeenCalled();
  });

  it("toggles bold between the two weights it sets", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor));

    // The stub layer is a heading at 700, so the first press has to take it back to regular.
    press({ key: "b", ctrlKey: true });
    expect(editor.updateLayer).toHaveBeenCalledWith("layer-1", { fontWeight: 400 });
  });

  it("leaves the text bindings alone for a layer that has no copy", () => {
    const editor = editorStub();
    editor.document = {
      background: { kind: "solid", color: "#111111" },
      layers: [
        {
          id: "layer-1",
          type: "shape",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          fill: "#000000",
          cornerRadius: 0,
          opacity: 1,
        },
      ],
    };
    renderHook(() => useEditorShortcuts(editor));

    press({ key: "i", ctrlKey: true });
    expect(editor.updateLayer).not.toHaveBeenCalled();
  });

  it("copies styling onto a layer of the same kind only", () => {
    const editor = editorStub();
    const { unmount } = renderHook(() => useEditorShortcuts(editor));

    press({ key: "c", code: "KeyC", ctrlKey: true, altKey: true });
    press({ key: "v", code: "KeyV", ctrlKey: true, altKey: true });

    expect(editor.updateLayer).toHaveBeenCalledWith(
      "layer-1",
      expect.objectContaining({ fontFamily: "Inter", fontSize: 64, color: "#ffffff" }),
    );
    // The text content and geometry stay with the layer being pasted onto.
    expect(editor.updateLayer).not.toHaveBeenCalledWith(
      "layer-1",
      expect.objectContaining({ text: "Hook" }),
    );
    unmount();

    const shapeEditor = editorStub();
    shapeEditor.document = {
      background: { kind: "solid", color: "#111111" },
      layers: [
        {
          id: "layer-1",
          type: "shape",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: "#000000",
          cornerRadius: 16,
          opacity: 0.6,
        },
      ],
    };
    renderHook(() => useEditorShortcuts(shapeEditor));

    press({ key: "v", code: "KeyV", ctrlKey: true, altKey: true });
    expect(shapeEditor.updateLayer).not.toHaveBeenCalled();
  });

  it("opens the shortcut list", () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useEditorShortcuts(editorStub(), { onShowShortcuts }));

    expect(press({ key: "?", ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    press({ key: "/", ctrlKey: true, shiftKey: true });
    expect(onShowShortcuts).toHaveBeenCalledTimes(2);
  });

  it("stays quiet while disabled", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor, { enabled: false }));

    press({ key: "z", ctrlKey: true });
    press({ key: "ArrowLeft" });

    expect(editor.undo).not.toHaveBeenCalled();
    expect(editor.nudgeLayer).not.toHaveBeenCalled();
  });
});
