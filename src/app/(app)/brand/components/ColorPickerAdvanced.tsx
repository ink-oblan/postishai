"use client";

import { Palette } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerAdvancedProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  onAddColor?: (hex: string) => void;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getComplementaryColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  const complementaryHue = (h + 180) % 360;
  return hslToHex(complementaryHue, s, l);
}

function getTriadicColors(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);
  const color1 = hslToHex((h + 120) % 360, s, l);
  const color2 = hslToHex((h + 240) % 360, s, l);
  return [color1, color2];
}

function getAnalogousColors(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);
  const color1 = hslToHex((h - 30 + 360) % 360, s, l);
  const color2 = hslToHex((h + 30) % 360, s, l);
  return [color1, color2];
}

export function ColorPickerAdvanced({
  value,
  onChange,
  label = "Color",
  onAddColor,
}: ColorPickerAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      {isOpen && (
        <div className="space-y-4 rounded-lg border border-border bg-muted p-4">
          {/* Hex input */}
          <div>
            <Label className="mb-2 block text-sm">{label}</Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm"
            />
          </div>

          {/* Color preview on background */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Preview</Label>
            <div className="h-16 rounded border border-border" style={{ backgroundColor: value }} />
          </div>

          {/* HSL display */}
          <div className="space-y-2 rounded bg-background p-3 text-xs">
            {(() => {
              const { h, s, l } = hexToHsl(value);
              return (
                <div className="space-y-1 font-mono text-muted-foreground">
                  <div>H: {h}°</div>
                  <div>S: {s}%</div>
                  <div>L: {l}%</div>
                </div>
              );
            })()}
          </div>

          {/* Complementary color suggestion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-xs">
              <span>Complementary</span>
              <button
                type="button"
                onClick={() => onAddColor?.(getComplementaryColor(value))}
                className="rounded bg-primary px-2 py-1 text-primary-foreground transition-opacity hover:opacity-80"
              >
                + Add
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded border border-border"
                style={{ backgroundColor: getComplementaryColor(value) }}
              />
              <code className="font-mono text-muted-foreground text-xs">
                {getComplementaryColor(value)}
              </code>
            </div>
          </div>

          {/* Triadic color suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-xs">
              <span>Triadic</span>
              <div className="flex gap-1">
                {getTriadicColors(value).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onAddColor?.(color)}
                    className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs transition-opacity hover:opacity-80"
                  >
                    + Add
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {getTriadicColors(value).map((color) => (
                <code key={color} className="text-center font-mono text-muted-foreground">
                  {color}
                </code>
              ))}
            </div>
          </div>

          {/* Analogous color suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-xs">
              <span>Analogous</span>
              <div className="flex gap-1">
                {getAnalogousColors(value).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onAddColor?.(color)}
                    className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs transition-opacity hover:opacity-80"
                  >
                    + Add
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {getAnalogousColors(value).map((color) => (
                <code key={color} className="text-center font-mono text-muted-foreground">
                  {color}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm transition-colors hover:bg-muted/80"
      >
        <Palette className="h-4 w-4" />
        {isOpen ? "Hide" : "Show"} Advanced Picker
      </button>
    </div>
  );
}
