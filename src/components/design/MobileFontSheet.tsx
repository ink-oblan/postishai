"use client";

import { Check } from "lucide-react";
import { EditorSheet } from "@/components/design/EditorSheet";
import type { FontChoice } from "@/lib/design/fonts";
import { cn } from "@/lib/utils";

interface MobileFontSheetProps {
  open: boolean;
  onClose: () => void;
  value: string;
  fonts: FontChoice[];
  resolveFontFamily: (name: string) => string;
  onSelect: (family: string) => void;
}

export function MobileFontSheet({
  open,
  onClose,
  value,
  fonts,
  resolveFontFamily,
  onSelect,
}: MobileFontSheetProps) {
  return (
    <EditorSheet open={open} onClose={onClose} title="Font">
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
    </EditorSheet>
  );
}
