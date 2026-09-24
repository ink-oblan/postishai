"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DesignEditorState, PageDocuments } from "@/components/design/useDesignEditor";

const DEFAULT_AUTOSAVE_DELAY_MS = 1000;

export interface AutosaveOptions {
  savePage: (pageId: string, document: PageDocuments[string]) => Promise<void>;
  /** Held off until startup corrections have landed, so a save cannot race them. */
  enabled: boolean;
  autosaveDelayMs?: number;
  onError: (error: unknown) => void;
}

export interface Autosave {
  saving: boolean;
  failed: boolean;
  /** Writes the given pages, or every dirty one. False if any write failed. */
  flush: (pageIds?: string[]) => Promise<boolean>;
  /** Flush with the `saving` flag raised, for the blocking paths before an export. */
  saveDirty: () => Promise<boolean>;
}

/**
 * Writes dirty pages back, one at a time and never overlapping. A page the user has left saves
 * at once; the one they are on waits out a quiet period so a burst of edits is a single write.
 */
export function useAutosave(
  editor: DesignEditorState,
  { savePage, enabled, autosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS, onError }: AutosaveOptions,
): Autosave {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const editorRef = useRef(editor);
  editorRef.current = editor;
  const saveRef = useRef(savePage);
  saveRef.current = savePage;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const writePages = useCallback(async (ids: string[]) => {
    const saved: PageDocuments = {};
    try {
      for (const id of ids) {
        const document = editorRef.current.documents[id];
        if (!document) continue;
        await saveRef.current(id, document);
        saved[id] = document;
      }
      setFailed(false);
      return true;
    } catch (err) {
      setFailed(true);
      errorRef.current(err);
      return false;
    } finally {
      if (Object.keys(saved).length > 0) editorRef.current.markSaved(saved);
    }
  }, []);

  const writes = useRef<Promise<boolean>>(Promise.resolve(true));

  const flush = useCallback(
    (ids?: string[]) => {
      const run = writes.current.then(() => writePages(ids ?? editorRef.current.dirtyPageIds));
      writes.current = run.catch(() => false);
      return run;
    },
    [writePages],
  );

  const saveDirty = useCallback(async () => {
    if (editorRef.current.dirtyPageIds.length === 0) return true;
    setSaving(true);
    try {
      return await flush();
    } finally {
      setSaving(false);
    }
  }, [flush]);

  useEffect(() => {
    if (!enabled) return;

    const pending = editor.dirtyPageIds.filter((id) => id !== editor.pageId);
    if (pending.length > 0) void flush(pending);
  }, [editor.dirtyPageIds, editor.pageId, flush, enabled]);

  const openPageDirty = editor.pageId !== null && editor.dirtyPageIds.includes(editor.pageId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the document so every edit pushes the save back
  useEffect(() => {
    if (!enabled || !openPageDirty) return;

    const timer = setTimeout(() => void flush(), autosaveDelayMs);
    return () => clearTimeout(timer);
  }, [editor.document, flush, enabled, openPageDirty, autosaveDelayMs]);

  useEffect(() => () => void flush(), [flush]);

  // Keep the browser guard in lockstep with the rendered save state. A passive effect can leave
  // the old listener alive briefly after React has already rendered "Saved".
  useLayoutEffect(() => {
    if (!editor.dirty) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [editor.dirty]);

  return { saving, failed, flush, saveDirty };
}
