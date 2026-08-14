"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  const addColor = () => {
    if (colors.length < maxColors) {
      const newColor: ColorItem = {
        id: Math.random().toString(36).slice(2),
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

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block font-semibold text-base">
          Color Palette <span className="text-destructive">*</span>
        </Label>
      </div>

      {/* Quick colors panel */}
      <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
        <p className="font-medium text-muted-foreground text-xs">Quick colors</p>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                const newColor: ColorItem = {
                  id: Math.random().toString(36).slice(2),
                  name: `Color ${colors.length + 1}`,
                  hex: preset,
                };
                if (colors.length < 5) {
                  onChange([...colors, newColor]);
                  setExpandedColorId(newColor.id);
                }
              }}
              className="h-8 rounded border-2 border-border transition-all hover:scale-110"
              style={{ backgroundColor: preset }}
              title={`Add ${preset}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {colors.map((color, index) => (
          <div
            key={color.id}
            className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 transition-all"
          >
            {/* Color header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedColorId(expandedColorId === color.id ? null : color.id)}
                className="h-10 w-10 flex-shrink-0 rounded-md border-2 border-border transition-colors hover:border-primary"
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />

              <Input
                type="text"
                value={color.hex}
                onChange={(e) => updateColor(color.id, e.target.value)}
                placeholder="#000000"
                className="h-10 flex-1 font-mono text-sm uppercase"
                maxLength={7}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeColor(color.id)}
                className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Delete this color"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Expanded color picker */}
            {expandedColorId === color.id && colors.length < 5 && (
              <div className="border-border border-t pt-3">
                <ColorPickerAdvanced
                  value={color.hex}
                  onChange={(hex) => updateColor(color.id, hex)}
                  label={`${index === 0 ? "Primary" : index === 1 ? "Secondary" : `Color ${index + 1}`} Color`}
                  onAddColor={(hex) => {
                    const newColor: ColorItem = {
                      id: Math.random().toString(36).slice(2),
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
      <div className="space-y-1 pt-2 text-center text-muted-foreground text-xs">
        <p>
          Add{" "}
          {2 - Math.min(colors.length, 2) > 0
            ? `${2 - Math.min(colors.length, 2)} more color${2 - Math.min(colors.length, 2) > 1 ? "s" : ""}`
            : "up to 3 more colors"}{" "}
          (2–5 total)
        </p>
        <p className="text-xs opacity-75">Primary & Secondary required</p>
      </div>
    </div>
  );
}
