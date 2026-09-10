import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesignEditorState } from "@/components/design/useDesignEditor";
import {
  NUDGE_STEP,
  NUDGE_STEP_COARSE,
  useEditorShortcuts,
} from "@/components/design/useEditorShortcuts";

function editorStub(selectedId: string | null = "layer-1"): DesignEditorState {
  return {
    document: { background: { kind: "solid", color: "#111111" }, layers: [] },
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
    duplicateLayer: vi.fn(),
    deleteLayer: vi.fn(),
    raiseLayer: vi.fn(),
    lowerLayer: vi.fn(),
    setDocument: vi.fn(),
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

  it("stays quiet while disabled", () => {
    const editor = editorStub();
    renderHook(() => useEditorShortcuts(editor, { enabled: false }));

    press({ key: "z", ctrlKey: true });
    press({ key: "ArrowLeft" });

    expect(editor.undo).not.toHaveBeenCalled();
    expect(editor.nudgeLayer).not.toHaveBeenCalled();
  });
});
