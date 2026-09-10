"use client";

import { useEffect, useRef } from "react";
import type { DesignEditorState } from "@/components/design/useDesignEditor";

/** Design pixels moved per arrow press, and per arrow press with Shift held. */
export const NUDGE_STEP = 4;
export const NUDGE_STEP_COARSE = 40;

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Widgets that own their own key handling, where an editor shortcut would fight the user. */
const INTERACTIVE_ROLES = '[role="combobox"],[role="listbox"],[role="menu"],[role="dialog"]';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;

  return target.closest(INTERACTIVE_ROLES) !== null;
}

function isActivatableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('button,a,[role="button"]') !== null;
}

export interface EditorShortcutOptions {
  /** Turned off while the editor is busy, so a keypress cannot mutate a document mid-render. */
  enabled?: boolean;
  onSave?: () => void;
  onNextSlide?: () => void;
  onPreviousSlide?: () => void;
}

export const EDITOR_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl+Z", label: "Undo" },
  { keys: "Ctrl+Shift+Z", label: "Redo" },
  { keys: "Ctrl+D", label: "Duplicate" },
  { keys: "Ctrl+S", label: "Save" },
  { keys: "Arrows", label: "Move (Shift for bigger steps)" },
  { keys: "Ctrl+[ / ]", label: "Send backward / bring forward" },
  { keys: "Delete", label: "Delete layer" },
  { keys: "Esc", label: "Deselect" },
  { keys: "Space / ← →", label: "Next or previous slide (nothing selected)" },
];

export function useEditorShortcuts(
  editor: DesignEditorState,
  { enabled = true, onSave, onNextSlide, onPreviousSlide }: EditorShortcutOptions = {},
) {
  const latest = useRef({ editor, onSave, onNextSlide, onPreviousSlide });
  latest.current = { editor, onSave, onNextSlide, onPreviousSlide };

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;

      const { editor, onSave, onNextSlide, onPreviousSlide } = latest.current;
      const { selectedId } = editor;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (mod && !event.altKey) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) editor.redo();
          else editor.undo();
          return;
        }
        if (key === "y") {
          event.preventDefault();
          editor.redo();
          return;
        }
        if (key === "s") {
          event.preventDefault();
          onSave?.();
          return;
        }
        if (key === "d" && selectedId) {
          event.preventDefault();
          editor.duplicateLayer(selectedId);
          return;
        }
        if ((key === "]" || key === "[") && selectedId) {
          event.preventDefault();
          if (key === "]") editor.raiseLayer(selectedId);
          else editor.lowerLayer(selectedId);
          return;
        }
        return;
      }

      if (key === "Escape") {
        editor.select(null);
        return;
      }

      if (!selectedId) {
        if (key === " " && !isActivatableTarget(event.target)) {
          event.preventDefault();
          onNextSlide?.();
          return;
        }
        if (key === "ArrowRight") {
          event.preventDefault();
          onNextSlide?.();
          return;
        }
        if (key === "ArrowLeft") {
          event.preventDefault();
          onPreviousSlide?.();
        }
        return;
      }

      if (key === "Delete" || key === "Backspace") {
        event.preventDefault();
        editor.deleteLayer(selectedId);
        return;
      }

      const delta = ARROW_DELTAS[key];
      if (delta) {
        event.preventDefault();
        const step = event.shiftKey ? NUDGE_STEP_COARSE : NUDGE_STEP;
        editor.nudgeLayer(selectedId, delta[0] * step, delta[1] * step);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (ARROW_DELTAS[event.key]) latest.current.editor.endGesture();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled]);
}
