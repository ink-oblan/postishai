"use client";

import { AlertCircle, CheckCircle2, ChevronDown, Pipette, Plus } from "lucide-react";
import { useRef, useState } from "react";

declare global {
  interface Window {
    EyeDropper?: {
      new (): {
        open: () => Promise<{ sRGBHex: string }>;
      };
    };
  }
}

import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/cross-remove-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPickerAdvanced } from "./ColorPickerAdvanced";

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

export interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

interface ColorPalettePickerProps {
  colors: ColorItem[];
  onChange: (colors: ColorItem[]) => void;
  maxColors?: number;
}

export function ColorPalettePicker({ colors, onChange, maxColors = 5 }: ColorPalettePickerProps) {
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

  const _updateColorName = (id: string, name: string) => {
    onChange(colors.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const isValid = colors.length >= 2;

  return (
    <div className="space-y-2">
      <Label>
        Color Palette <span className="text-destructive">*</span>
      </Label>

      <div
        className={`rounded-lg border p-4 ${
          isValid ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <p className="text-muted-foreground text-xs">
            Select at least 2 colors for your brand palette
          </p>
          {isValid ? (
            <CheckCircle2
              className="ml-2 h-5 w-5 flex-shrink-0 text-green-500"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle className="ml-2 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
          )}
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
            {colors.map((color) => (
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
                        transform: expandedColorId === color.id ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    />
                  </button>

                  <div
                    className="h-10 w-10 flex-shrink-0 rounded-md border-2 border-border"
                    style={{ backgroundColor: color.hex }}
                    title={color.hex}
                  />

                  <Input
                    type="text"
                    value={color.hex}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateColor(color.id, e.target.value);
                    }}
                    placeholder="#000000"
                    className="h-10 flex-1 font-mono text-sm uppercase"
                    maxLength={7}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <button
                    type="button"
                    title="Pick color from screen"
                    className="flex-shrink-0 rounded border border-border bg-muted px-2 py-2 transition-colors hover:bg-muted/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.EyeDropper) {
                        new window.EyeDropper()
                          .open()
                          .then((result: { sRGBHex: string }) => {
                            updateColor(color.id, result.sRGBHex);
                          })
                          .catch(() => {});
                      }
                    }}
                  >
                    <Pipette className="h-4 w-4" />
                  </button>

                  <RemoveButton
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColor(color.id);
                    }}
                    aria-label="Delete this color"
                    className="flex-shrink-0"
                  />
                </div>

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
            ))}
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
              colors.length >= 2 ? "text-muted-foreground" : "font-medium text-red-500"
            }`}
          >
            <p>
              Add{" "}
              {2 - Math.min(colors.length, 2) > 0
                ? `${2 - Math.min(colors.length, 2)} more color${2 - Math.min(colors.length, 2) > 1 ? "s" : ""}`
                : "up to 3 more colors"}{" "}
              (2–5 total)
            </p>
            <p className={colors.length >= 2 ? "text-xs opacity-75" : "text-red-500 text-xs"}>
              Primary & Secondary required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
