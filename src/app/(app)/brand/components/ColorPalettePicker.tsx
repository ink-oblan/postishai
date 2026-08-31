"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/cross-remove-button";
import { EyeDropperButton } from "@/components/ui/eyedropper-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ColorItem, fieldLimits, isValidHexColor } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import { ColorPickerAdvanced } from "./ColorPickerAdvanced";
import { FieldStatusIcon, fieldTone, TONE_BLOCK_CLASS } from "./FieldStatus";

const PRESET_COLORS = [
  // Reds
  "#E74C3C",
  "#C0392B",
  // Oranges
  "#E67E22",
  "#D35400",
  // Yellows
  "#F39C12",
  "#F1C40F",
  // Greens
  "#27AE60",
  "#16A085",
  // Teals
  "#1ABC9C",
  "#3498DB",
  // Blues
  "#2980B9",
  "#2C3E50",
  // Purples
  "#8E44AD",
  "#9B59B6",
  // Pinks
  "#E91E63",
  "#C2185B",
  // Grays
  "#95A5A6",
  "#7F8C8D",
  // Neutrals
  "#000000",
  "#FFFFFF",
];

interface ColorPalettePickerProps {
  colors: ColorItem[];
  onChange: (colors: ColorItem[]) => void;
  maxColors?: number;
  changes?: FieldChanges;
}

export function ColorPalettePicker({
  colors,
  onChange,
  maxColors = fieldLimits("colors").max,
  changes,
}: ColorPalettePickerProps) {
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);
  const colorIdCounter = useRef(0);

  const generateColorId = () => {
    return `color-${++colorIdCounter.current}-${Date.now()}`;
  };

  const addColor = () => {
    if (colors.length < maxColors) {
      const newColor: ColorItem = {
        id: generateColorId(),
        name: `Color ${colors.length + 1}`,
        hex: "#000000",
      };
      onChange([...colors, newColor]);
      setExpandedColorId(newColor.id);
    }
  };

  const removeColor = (id: string) => {
    onChange(colors.filter((c) => c.id !== id));
    if (expandedColorId === id) {
      setExpandedColorId(null);
    }
  };

  const updateColor = (id: string, hex: string) => {
    onChange(colors.map((c) => (c.id === id ? { ...c, hex } : c)));
  };

  const minColors = fieldLimits("colors").min;
  const missing = Math.max(minColors - colors.length, 0);
  const hasInvalidHex = colors.some((color) => !isValidHexColor(color.hex));
  const isValid = missing === 0 && !hasInvalidHex;
  const tone = fieldTone({ invalid: !isValid, changed: Boolean(changes?.colors), filled: true });

  return (
    <div className="space-y-2">
      <Label>
        Color Palette <span className="text-destructive">*</span>
      </Label>

      <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[tone]}`}>
        <div className="mb-4 flex items-start justify-between">
          <p className="text-muted-foreground text-xs">
            Select at least 2 colors for your brand palette
          </p>
          <FieldStatusIcon tone={tone} field="colors" changes={changes} className="ml-2" />
        </div>
        <div className="space-y-4">
          {/* Quick colors panel */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="font-medium text-muted-foreground text-xs">Quick colors</p>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={colors.length >= maxColors}
                  onClick={() => {
                    const newColor: ColorItem = {
                      id: generateColorId(),
                      name: `Color ${colors.length + 1}`,
                      hex: preset,
                    };
                    if (colors.length < maxColors) {
                      onChange([...colors, newColor]);
                      setExpandedColorId(newColor.id);
                    }
                  }}
                  className={`h-8 rounded border-2 border-border transition-all ${colors.length >= maxColors ? "cursor-not-allowed opacity-50" : "hover:scale-110"}`}
                  style={{ backgroundColor: preset }}
                  title={`Add ${preset}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {colors.map((color) => {
              const isHexValid = isValidHexColor(color.hex);
              return (
                <div
                  key={color.id}
                  className="space-y-2 rounded-lg border border-border bg-muted/30 p-3"
                >
                  {/* Color header */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedColorId(expandedColorId === color.id ? null : color.id)
                      }
                      className="flex-shrink-0 p-0 transition-opacity hover:opacity-80"
                    >
                      <ChevronDown
                        className="h-5 w-5 transition-transform"
                        style={{
                          transform:
                            expandedColorId === color.id ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      />
                    </button>

                    <div
                      className={`h-10 w-10 flex-shrink-0 rounded-md border-2 ${isHexValid ? "border-border" : "border-red-500 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(239,68,68,0.25)_4px,rgba(239,68,68,0.25)_8px)]"}`}
                      style={isHexValid ? { backgroundColor: color.hex } : undefined}
                      title={isHexValid ? color.hex : "Not a valid hex color"}
                    />

                    <Input
                      type="text"
                      value={color.hex}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateColor(color.id, e.target.value);
                      }}
                      placeholder="#000000"
                      className={`h-10 flex-1 font-mono text-sm uppercase ${isHexValid ? "" : "border-red-500 focus-visible:ring-red-500"}`}
                      maxLength={9}
                      aria-invalid={!isHexValid}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <EyeDropperButton onPick={(hex) => updateColor(color.id, hex)} />

                    <RemoveButton
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColor(color.id);
                      }}
                      aria-label="Delete this color"
                      className="flex-shrink-0"
                    />
                  </div>

                  {!isHexValid && (
                    <p className="pl-9 text-red-500 text-xs">
                      Not a valid hex color — use 3 to 8 hex digits, e.g. #FF0000
                    </p>
                  )}

                  {/* Expanded color picker */}
                  {expandedColorId === color.id && (
                    <div className="border-border border-t pt-3">
                      <ColorPickerAdvanced
                        value={color.hex}
                        onChange={(hex) => updateColor(color.id, hex)}
                        isMaxReached={colors.length >= maxColors}
                        onAddColor={(hex) => {
                          const newColor: ColorItem = {
                            id: generateColorId(),
                            name: `Color ${colors.length + 1}`,
                            hex,
                          };
                          onChange([...colors, newColor]);
                          setExpandedColorId(newColor.id);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add color button */}
          {colors.length < maxColors && (
            <Button type="button" variant="outline" size="sm" onClick={addColor} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Color
            </Button>
          )}

          {/* Info hint */}
          <div
            className={`space-y-1 pt-2 text-center text-xs ${
              isValid ? "text-muted-foreground" : "font-medium text-red-500"
            }`}
          >
            <p>
              Add{" "}
              {missing > 0
                ? `${missing} more color${missing > 1 ? "s" : ""}`
                : `up to ${maxColors - colors.length} more color${maxColors - colors.length === 1 ? "" : "s"}`}{" "}
              ({minColors}–{maxColors} total)
            </p>
            <p className={isValid ? "text-xs opacity-75" : "text-red-500 text-xs"}>
              Primary & Secondary required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
