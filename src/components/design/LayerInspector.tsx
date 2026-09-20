"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Italic,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOLD_WEIGHT,
  isBold,
  type Layer,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  REGULAR_WEIGHT,
  type TextAlign,
} from "@/lib/design/document";
import type { FontChoice } from "@/lib/design/fonts";

const ALIGNMENTS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "Align left" },
  { value: "center", icon: AlignCenter, label: "Align centre" },
  { value: "right", icon: AlignRight, label: "Align right" },
];

/** The decorations are plain flags on the layer, so one list drives all three toggles. */
const DECORATIONS: {
  key: "italic" | "underline" | "lineThrough";
  icon: typeof Italic;
  label: string;
}[] = [
  { key: "italic", icon: Italic, label: "Italic (Ctrl+I)" },
  { key: "underline", icon: Underline, label: "Underline (Ctrl+U)" },
  { key: "lineThrough", icon: Strikethrough, label: "Strikethrough (Ctrl+Shift+X)" },
];

/**
 * A colour input paints its swatch inside the field's own padding, and the browser gives that
 * swatch a border of its own. Clearing both is what lets the colour fill the whole control.
 */
const COLOR_INPUT_CLASS =
  "h-9 overflow-hidden p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0";

interface LayerInspectorProps {
  layer: Layer | null;
  fonts: FontChoice[];
  resolveFontFamily: (name: string) => string;
  onChange: (patch: Partial<Layer>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRaise: () => void;
  onLower: () => void;
  /** Turning a plate on reads the photo behind the copy, so the colour is chosen upstream. */
  onTogglePlate: (on: boolean) => void;
}

export function LayerInspector({
  layer,
  fonts,
  resolveFontFamily,
  onChange,
  onDuplicate,
  onDelete,
  onRaise,
  onLower,
  onTogglePlate,
}: LayerInspectorProps) {
  if (!layer) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm capitalize">{layer.type}</p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLower}
            title="Send backward (Ctrl+[)"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRaise}
            title="Bring forward (Ctrl+])"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            title="Duplicate layer (Ctrl+D)"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            title="Delete layer (Delete)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {layer.type === "text" && (
        <>
          <div className="space-y-2">
            <Label>Font</Label>
            <Select
              value={layer.fontFamily}
              onValueChange={(value: string | null) => value && onChange({ fontFamily: value })}
            >
              <SelectTrigger>
                <SelectValue style={{ fontFamily: resolveFontFamily(layer.fontFamily) }}>
                  {fonts.find((font) => font.family === layer.fontFamily)?.name ?? layer.fontFamily}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[min(16rem,var(--available-height))] max-w-[calc(100vw-2rem)]">
                {fonts.map((font) => (
                  <SelectItem
                    key={font.family}
                    value={font.family}
                    style={{ fontFamily: resolveFontFamily(font.family) }}
                  >
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="layer-size">Size</Label>
              <Input
                id="layer-size"
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={layer.fontSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ fontSize: Number(e.target.value) || layer.fontSize })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant={isBold(layer.fontWeight) ? "default" : "outline"}
                  size="sm"
                  title="Bold (Ctrl+B)"
                  aria-pressed={isBold(layer.fontWeight)}
                  onClick={() =>
                    onChange({
                      fontWeight: isBold(layer.fontWeight) ? REGULAR_WEIGHT : BOLD_WEIGHT,
                    })
                  }
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                {DECORATIONS.map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={layer[key] ? "default" : "outline"}
                    size="sm"
                    title={label}
                    aria-pressed={layer[key]}
                    onClick={() => onChange({ [key]: !layer[key] })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="layer-color">Colour</Label>
              <Input
                id="layer-color"
                type="color"
                value={layer.color.slice(0, 7)}
                className={COLOR_INPUT_CLASS}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ color: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <div className="flex gap-1">
                {ALIGNMENTS.map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={layer.align === value ? "default" : "outline"}
                    size="sm"
                    title={label}
                    onClick={() => onChange({ align: value })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="text-highlight">Text highlighting</Label>
              <Checkbox
                id="text-highlight"
                checked={Boolean(layer.background)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onTogglePlate(event.target.checked)
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              A band drawn behind the copy, tinted to the photo behind it and darkened only as far
              as the text needs.
            </p>

            {layer.background && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="plate-color">Colour</Label>
                  <Input
                    id="plate-color"
                    type="color"
                    value={layer.background.color.slice(0, 7)}
                    className={COLOR_INPUT_CLASS}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      layer.background &&
                      onChange({ background: { ...layer.background, color: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate-opacity">Opacity</Label>
                  <Input
                    id="plate-opacity"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layer.background.opacity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      layer.background &&
                      onChange({
                        background: {
                          ...layer.background,
                          opacity: Math.min(1, Math.max(0, Number(e.target.value))),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {layer.type === "shape" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="shape-fill">Fill</Label>
            <Input
              id="shape-fill"
              type="color"
              value={layer.fill.slice(0, 7)}
              className={COLOR_INPUT_CLASS}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ fill: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shape-opacity">Opacity</Label>
            <Input
              id="shape-opacity"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })
              }
            />
          </div>
        </div>
      )}

      {layer.type === "logo" && (
        <p className="text-muted-foreground text-xs">
          Drag or resize the logo on the slide to position it.
        </p>
      )}
    </div>
  );
}
