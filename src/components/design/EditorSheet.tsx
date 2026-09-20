"use client";

import { Dialog } from "@base-ui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Recolours the shared ui primitives onto the sheet's dark surface. */
const SURFACE_CLASS = [
  "border-primary-foreground/20 bg-primary/95 text-primary-foreground backdrop-blur-xl",
  "[&_[data-slot=button]]:border-primary-foreground/30",
  "[&_[data-slot=button]]:bg-primary-foreground/10",
  "[&_[data-slot=button]]:text-primary-foreground",
  "[&_[data-slot=button]]:hover:bg-primary-foreground/20",
  "[&_[data-slot=input]]:border-primary-foreground/30",
  "[&_[data-slot=textarea]]:border-primary-foreground/30",
  "[&_[data-slot=select-trigger]]:border-primary-foreground/30",
  "[&_[data-slot=checkbox]]:accent-auto",
  "[&_.border-border]:border-primary-foreground/30",
  "[&_.border-t]:border-primary-foreground/20",
  "[&_.text-muted-foreground]:text-primary-foreground/70",
].join(" ");

const POPUP_CLASS =
  "fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto max-h-[min(70dvh,32rem)] max-w-md overflow-y-auto rounded-2xl border px-4 pt-2 pb-4 shadow-2xl transition-all duration-200 data-[ending-style]:translate-y-3 data-[starting-style]:translate-y-3 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0";

export const SHEET_COLOR_INPUT_CLASS =
  "h-9 overflow-hidden p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0";

interface EditorSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function EditorSheet({ open, onClose, title, children }: EditorSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className={cn(POPUP_CLASS, SURFACE_CLASS)}>
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-primary-foreground/30" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="font-semibold text-sm capitalize">{title}</Dialog.Title>
            <Dialog.Close
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Close options"
                  className="size-9 rounded-full"
                />
              }
            >
              <X />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
