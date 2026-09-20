"use client";

import type { ReactNode } from "react";
import { EditorSheet, SHEET_COLOR_INPUT_CLASS } from "@/components/design/EditorSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Layer, TextLayer } from "@/lib/design/document";

interface PageOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  layer: Layer | null;
  /** The noun for a page with nothing selected — "slide" in a carousel. */
  pageLabel: string;
  onChange: (patch: Partial<Layer>) => void;
  /** Host options, shown when no layer is selected. */
  children?: ReactNode;
}

export function PageOptionsSheet({
  open,
  onClose,
  layer,
  pageLabel,
  onChange,
  children,
}: PageOptionsSheetProps) {
  return (
    <EditorSheet open={open} onClose={onClose} title={layer ? layer.type : pageLabel}>
      {layer?.type === "text" && layer.background && (
        <HighlightOptions layer={layer} onChange={onChange} />
      )}
      {layer?.type === "logo" && (
        <p className="text-muted-foreground text-sm">
          Drag or pinch the logo on the canvas to place it.
        </p>
      )}
      {!layer && <div className="space-y-5">{children}</div>}
    </EditorSheet>
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
          className={SHEET_COLOR_INPUT_CLASS}
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
