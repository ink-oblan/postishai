"use client";

import { Dialog } from "@base-ui/react";
import { EDITOR_SHORTCUT_GROUPS } from "@/components/design/useEditorShortcuts";
import { Button } from "@/components/ui/button";

interface ShortcutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutDialog({ open, onOpenChange }: ShortcutDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:p-6">
          <Dialog.Title className="font-semibold text-base">Keyboard shortcuts</Dialog.Title>
          <Dialog.Description className="mt-1 text-muted-foreground text-sm">
            On a Mac, use Cmd wherever Ctrl is listed.
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            {EDITOR_SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div key={shortcut.keys} className="flex items-center gap-3 text-sm">
                      <kbd className="min-w-32 shrink-0 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-[10px]">
                        {shortcut.keys}
                      </kbd>
                      <span className="text-muted-foreground">{shortcut.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close render={<Button variant="outline" size="sm" />}>Close</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
