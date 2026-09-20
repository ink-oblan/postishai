"use client";

import { Dialog } from "@base-ui/react";
import { Check, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { resolveFontFamily } from "@/components/design/font-catalogue";
import type { FontChoice } from "@/components/design/LayerInspector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Layer, TextLayer } from "@/lib/design/document";
import { cn } from "@/lib/utils";

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

const COLOR_INPUT_CLASS =
  "h-9 overflow-hidden p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0";

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
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

interface MobileFontSheetProps {
  open: boolean;
  onClose: () => void;
  value: string;
  fonts: FontChoice[];
  onSelect: (family: string) => void;
}

export function MobileFontSheet({ open, onClose, value, fonts, onSelect }: MobileFontSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Font">
      <div className="flex flex-col gap-1">
        {fonts.map((font) => {
          const selected = font.family === value;
          return (
            <button
              key={font.family}
              type="button"
              aria-pressed={selected}
              style={{ fontFamily: resolveFontFamily(font.family) }}
              onClick={() => {
                onSelect(font.family);
                onClose();
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-base transition-colors hover:bg-primary-foreground/10",
                selected && "bg-primary-foreground/15",
              )}
            >
              <span className="truncate">{font.name}</span>
              {selected && <Check className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

interface MobileOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  layer: Layer | null;
  highlightAll: { all: boolean; some: boolean };
  platingAll: boolean;
  busy: boolean;
  onChange: (patch: Partial<Layer>) => void;
  onHighlightAll: (on: boolean) => void;
  children?: ReactNode;
}

export function MobileOptionsSheet({
  open,
  onClose,
  layer,
  highlightAll,
  platingAll,
  busy,
  onChange,
  onHighlightAll,
  children,
}: MobileOptionsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={layer ? layer.type : "Slide"}>
      {layer?.type === "text" && layer.background && (
        <HighlightOptions layer={layer} onChange={onChange} />
      )}
      {layer?.type === "logo" && (
        <p className="text-muted-foreground text-sm">
          Drag or pinch the logo on the slide to place it.
        </p>
      )}
      {!layer && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="mobile-highlight-all"
                indeterminate={highlightAll.some}
                checked={highlightAll.all}
                disabled={busy || platingAll}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onHighlightAll(event.target.checked)
                }
              />
              <Label htmlFor="mobile-highlight-all">Highlight text on every slide</Label>
              {platingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </div>
          </div>
          {children}
        </div>
      )}
    </Sheet>
  );
}

function HighlightOptions({
  layer,
  onChange,
}: {
  layer: TextLayer;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const background = layer.background;
  if (!background) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="mobile-plate-color">Highlight colour</Label>
        <Input
          id="mobile-plate-color"
          type="color"
          value={background.color.slice(0, 7)}
          className={COLOR_INPUT_CLASS}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ background: { ...background, color: event.target.value } })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mobile-plate-opacity">
          Highlight opacity {Math.round(background.opacity * 100)}%
        </Label>
        <input
          id="mobile-plate-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={background.opacity}
          className="h-9 w-full accent-primary-foreground"
          onChange={(event) =>
            onChange({ background: { ...background, opacity: Number(event.target.value) } })
          }
        />
      </div>
    </div>
  );
}
