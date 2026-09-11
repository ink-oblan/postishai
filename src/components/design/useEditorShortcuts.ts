"use client";

import { useEffect, useRef } from "react";
import {
  copyLayer,
  copyLayerStyle,
  readCopiedLayer,
  readCopiedStyle,
} from "@/components/design/layer-clipboard";
import type { AlignEdge, DesignEditorState } from "@/components/design/useDesignEditor";
import { BOLD_WEIGHT, isBold, REGULAR_WEIGHT } from "@/lib/design/document";

/** Design pixels moved per arrow press, and per arrow press with Shift held. */
export const NUDGE_STEP = 4;
export const NUDGE_STEP_COARSE = 40;

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Keyed on physical position, not `event.key`: holding Alt on macOS composes a symbol, so an
 * Alt+A press reports "å" and every one of these would miss.
 */
const ALIGN_EDGES: Record<string, AlignEdge> = {
  KeyA: "left",
  KeyD: "right",
  KeyW: "top",
  KeyS: "bottom",
  KeyH: "centerX",
  KeyV: "centerY",
};

/** Text decorations reachable with the modifier alone, and with Shift held. */
const DECORATIONS: Record<string, "italic" | "underline"> = { i: "italic", u: "underline" };
const SHIFTED_DECORATIONS: Record<string, "lineThrough"> = { x: "lineThrough" };

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

/** Every key the modifier branch spends, whether or not the current selection can use it. */
const MODIFIED_KEYS = new Set([
  "z",
  "y",
  "s",
  "d",
  "b",
  "i",
  "u",
  "c",
  "x",
  "v",
  "[",
  "]",
  "?",
  "/",
]);

/**
 * The bindings a browser answers itself and a text field has no use for. Typing in the prompt box
 * still has to cost the user their bookmarks sidebar, so these are swallowed there too — without
 * running the editor action, which belongs to the canvas.
 */
const CHROME_ONLY_KEYS = new Set(["b", "d", "i", "u", "s", "[", "]"]);

const CODE_KEYS: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Slash: "/",
};

const LATIN_BINDING = /^[a-z0-9[\]/?]$/;

/**
 * `event.key` carries whatever the active layout prints, so under a Cyrillic or Greek layout
 * Ctrl+B reports a letter none of the bindings know — while the browser still answers the
 * physical key with its bookmarks. Falling back to `event.code` keeps both in step.
 */
function bindingKey(event: KeyboardEvent): string {
  if (event.key.length !== 1) return event.key;

  const key = event.key.toLowerCase();
  if (LATIN_BINDING.test(key)) return key;
  if (event.code.startsWith("Key")) return event.code.slice(3).toLowerCase();

  return CODE_KEYS[event.code] ?? key;
}

/**
 * A binding is claimed by its combination alone, never by whether it would do anything: Ctrl+B
 * with nothing selected still has to be swallowed, or the browser opens its bookmarks over an
 * editor the user only meant to type in.
 */
function claimsKey(event: KeyboardEvent, key: string): boolean {
  if (event.metaKey || event.ctrlKey) {
    if (event.altKey) return event.code === "KeyC" || event.code === "KeyV";
    return MODIFIED_KEYS.has(key);
  }

  if (event.altKey) return ALIGN_EDGES[event.code] !== undefined;
  if (ARROW_DELTAS[key] || key === "Delete" || key === "Backspace") return true;

  return key === " " && !isActivatableTarget(event.target);
}

export interface EditorShortcutOptions {
  /**
   * Turned off while the editor is busy, so a keypress cannot mutate a document mid-render. The
   * browser-only bindings stay swallowed either way — being busy is no reason to lose the page.
   */
  enabled?: boolean;
  onSave?: () => void;
  onNextSlide?: () => void;
  onPreviousSlide?: () => void;
  onShowShortcuts?: () => void;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; label: string }[];
}

export const EDITOR_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Edit",
    shortcuts: [
      { keys: "Ctrl+Z", label: "Undo" },
      { keys: "Ctrl+Shift+Z", label: "Redo" },
      { keys: "Ctrl+D", label: "Duplicate" },
      { keys: "Ctrl+S", label: "Save slide" },
      { keys: "Delete", label: "Delete layer" },
      { keys: "Esc", label: "Deselect" },
    ],
  },
  {
    title: "Clipboard",
    shortcuts: [
      { keys: "Ctrl+C / Ctrl+X", label: "Copy or cut the layer" },
      { keys: "Ctrl+V", label: "Paste in place — including onto another slide" },
      { keys: "Ctrl+Shift+V", label: "Paste over the selected layer" },
      { keys: "Ctrl+Alt+C", label: "Copy the layer's styling" },
      { keys: "Ctrl+Alt+V", label: "Paste styling onto the same kind of layer" },
    ],
  },
  {
    title: "Text",
    shortcuts: [
      { keys: "Ctrl+B", label: "Bold" },
      { keys: "Ctrl+I", label: "Italic" },
      { keys: "Ctrl+U", label: "Underline" },
      { keys: "Ctrl+Shift+X", label: "Strikethrough" },
    ],
  },
  {
    title: "Arrange",
    shortcuts: [
      { keys: "Arrows", label: "Move (Shift for bigger steps)" },
      { keys: "Alt+A / Alt+D", label: "Align to the left / right of the safe area" },
      { keys: "Alt+W / Alt+S", label: "Align to the top / bottom of the safe area" },
      { keys: "Alt+H / Alt+V", label: "Center across / down the safe area" },
      { keys: "Ctrl+[ / ]", label: "Send backward / bring forward" },
    ],
  },
  {
    title: "Slides",
    shortcuts: [
      { keys: "Space / ← →", label: "Next or previous slide (nothing selected)" },
      { keys: "Ctrl+Shift+?", label: "Show this list" },
    ],
  },
];

export function useEditorShortcuts(
  editor: DesignEditorState,
  {
    enabled = true,
    onSave,
    onNextSlide,
    onPreviousSlide,
    onShowShortcuts,
  }: EditorShortcutOptions = {},
) {
  const latest = useRef({ editor, onSave, onNextSlide, onPreviousSlide, onShowShortcuts });
  latest.current = { editor, onSave, onNextSlide, onPreviousSlide, onShowShortcuts };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;

      const mod = event.metaKey || event.ctrlKey;
      const key = bindingKey(event);

      // Typing in a field, or busy rendering, still costs the user their bookmarks sidebar if the
      // browser is left to answer — but the keys a field or an open dialog drives are its own.
      if (!enabled || isTypingTarget(event.target)) {
        if (mod && !event.altKey && CHROME_ONLY_KEYS.has(key)) event.preventDefault();
        return;
      }

      if (claimsKey(event, key)) event.preventDefault();

      const { editor, onSave, onNextSlide, onPreviousSlide, onShowShortcuts } = latest.current;
      const { selectedId } = editor;
      const selected = selectedId
        ? (editor.document.layers.find((layer) => layer.id === selectedId) ?? null)
        : null;

      if (mod) {
        // Alt rides along with the modifier for the two property-clipboard bindings, so it has to
        // be settled before anything else — and claimed either way, or Ctrl+Alt+Arrow would nudge.
        if (event.altKey) {
          if (event.code === "KeyC" && selected) {
            copyLayerStyle(selected);
            return;
          }
          if (event.code === "KeyV" && selected) {
            const style = readCopiedStyle(selected.type);
            if (style) editor.updateLayer(selected.id, style);
          }
          return;
        }

        if (key === "z") {
          if (event.shiftKey) editor.redo();
          else editor.undo();
          return;
        }
        if (key === "y") {
          editor.redo();
          return;
        }
        if (key === "s") {
          onSave?.();
          return;
        }
        if (key === "d" && selectedId) {
          editor.duplicateLayer(selectedId);
          return;
        }
        // Ahead of the clipboard bindings: strikethrough rides on the same key as cut.
        if (selected?.type === "text") {
          if (key === "b") {
            editor.updateLayer(selected.id, {
              fontWeight: isBold(selected.fontWeight) ? REGULAR_WEIGHT : BOLD_WEIGHT,
            });
            return;
          }

          const decoration = event.shiftKey ? SHIFTED_DECORATIONS[key] : DECORATIONS[key];
          if (decoration) {
            editor.updateLayer(selected.id, { [decoration]: !selected[decoration] });
            return;
          }
        }
        if ((key === "c" || key === "x") && selected && !event.shiftKey) {
          copyLayer(selected);
          if (key === "x") editor.deleteLayer(selected.id);
          return;
        }
        if (key === "v") {
          const copied = readCopiedLayer();
          if (copied) {
            // Pasting in place is what carries a layer to the same spot on another slide;
            // Shift anchors it on the selection instead, the way Figma pastes over one.
            const over = event.shiftKey && selected ? { x: selected.x, y: selected.y } : undefined;
            editor.pasteLayer(copied, over);
          }
          return;
        }
        if ((key === "]" || key === "[") && selectedId) {
          if (key === "]") editor.raiseLayer(selectedId);
          else editor.lowerLayer(selectedId);
          return;
        }
        // Layouts that need Shift for "?" report either character, depending on the browser.
        if (event.shiftKey && (key === "?" || key === "/")) onShowShortcuts?.();
        return;
      }

      if (event.altKey) {
        const edge = ALIGN_EDGES[event.code];
        if (edge && selectedId) editor.alignLayer(selectedId, edge);
        return;
      }

      if (key === "Escape") {
        editor.select(null);
        return;
      }

      if (!selectedId) {
        if (key === " " && !isActivatableTarget(event.target)) {
          onNextSlide?.();
          return;
        }
        if (key === "ArrowRight") {
          onNextSlide?.();
          return;
        }
        if (key === "ArrowLeft") onPreviousSlide?.();
        return;
      }

      if (key === "Delete" || key === "Backspace") {
        editor.deleteLayer(selectedId);
        return;
      }

      const delta = ARROW_DELTAS[key];
      if (delta) {
        const step = event.shiftKey ? NUDGE_STEP_COARSE : NUDGE_STEP;
        editor.nudgeLayer(selectedId, delta[0] * step, delta[1] * step);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (enabled && ARROW_DELTAS[event.key]) latest.current.editor.endGesture();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled]);
}
