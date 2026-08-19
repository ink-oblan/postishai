"use client";

import { Palette } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface ColorPickerAdvancedProps {
  value: string;
  onChange: (hex: string) => void;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, x)).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join("")
      .toUpperCase()
  );
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) =>
    Math.round((val + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
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

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

const sliderCss = `
  input[type="range"] {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 12px;
    border-radius: 12px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    border-radius: 12px;
  }

  input[type="range"]::-moz-range-track {
    border-radius: 12px;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }
`;

export function ColorPickerAdvanced({ value, onChange, onAddColor }: ColorPickerAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { h, s, l } = hexToHsl(value);
  const { r, g, b } = hexToRgb(value);

  const handleRgbChange = (newR: number, newG: number, newB: number) => {
    onChange(rgbToHex(newR, newG, newB));
  };

  const handleHslChange = (newH: number, newS: number, newL: number) => {
    onChange(hslToHex(newH, newS, newL));
  };

  return (
    <div
      className="space-y-3"
      role="none"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <style>{sliderCss}</style>
      <style>{`
        .slider-r::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, rgb(0, ${g}, ${b}), rgb(255, ${g}, ${b}));
        }
        .slider-r::-moz-range-track {
          background: linear-gradient(90deg, rgb(0, ${g}, ${b}), rgb(255, ${g}, ${b}));
        }
        .slider-r::-webkit-slider-thumb {
          background: rgb(${r}, ${g}, ${b});
        }
        .slider-r::-moz-range-thumb {
          background: rgb(${r}, ${g}, ${b});
        }

        .slider-g::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, rgb(${r}, 0, ${b}), rgb(${r}, 255, ${b}));
        }
        .slider-g::-moz-range-track {
          background: linear-gradient(90deg, rgb(${r}, 0, ${b}), rgb(${r}, 255, ${b}));
        }
        .slider-g::-webkit-slider-thumb {
          background: rgb(${r}, ${g}, ${b});
        }
        .slider-g::-moz-range-thumb {
          background: rgb(${r}, ${g}, ${b});
        }

        .slider-b::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, rgb(${r}, ${g}, 0), rgb(${r}, ${g}, 255));
        }
        .slider-b::-moz-range-track {
          background: linear-gradient(90deg, rgb(${r}, ${g}, 0), rgb(${r}, ${g}, 255));
        }
        .slider-b::-webkit-slider-thumb {
          background: rgb(${r}, ${g}, ${b});
        }
        .slider-b::-moz-range-thumb {
          background: rgb(${r}, ${g}, ${b});
        }

        .slider-h::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, hsl(0, ${s}%, ${l}%), hsl(60, ${s}%, ${l}%), hsl(120, ${s}%, ${l}%), hsl(180, ${s}%, ${l}%), hsl(240, ${s}%, ${l}%), hsl(300, ${s}%, ${l}%), hsl(360, ${s}%, ${l}%));
        }
        .slider-h::-moz-range-track {
          background: linear-gradient(90deg, hsl(0, ${s}%, ${l}%), hsl(60, ${s}%, ${l}%), hsl(120, ${s}%, ${l}%), hsl(180, ${s}%, ${l}%), hsl(240, ${s}%, ${l}%), hsl(300, ${s}%, ${l}%), hsl(360, ${s}%, ${l}%));
        }
        .slider-h::-webkit-slider-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }
        .slider-h::-moz-range-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }

        .slider-s::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%));
        }
        .slider-s::-moz-range-track {
          background: linear-gradient(90deg, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%));
        }
        .slider-s::-webkit-slider-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }
        .slider-s::-moz-range-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }

        .slider-l::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%));
        }
        .slider-l::-moz-range-track {
          background: linear-gradient(90deg, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%));
        }
        .slider-l::-webkit-slider-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }
        .slider-l::-moz-range-thumb {
          background: hsl(${h}, ${s}%, ${l}%);
        }
      `}</style>

      {/* Color preview block */}
      <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
        {/* Text preview on color background */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Preview</Label>
          <div
            className="flex items-center justify-center rounded border border-border px-4 py-6 text-center font-medium"
            style={{ backgroundColor: value, color: getContrastColor(value) }}
          >
            Sample Text
          </div>
        </div>

        {/* RGB sliders */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">RGB</Label>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-r" className="text-muted-foreground text-xs">
                  R (Red)
                </label>
                <span className="font-mono text-sm">{r}</span>
              </div>
              <input
                id="slider-r"
                type="range"
                min="0"
                max="255"
                value={r}
                onChange={(e) => handleRgbChange(parseInt(e.target.value, 10), g, b)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="slider-r w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-g" className="text-muted-foreground text-xs">
                  G (Green)
                </label>
                <span className="font-mono text-sm">{g}</span>
              </div>
              <input
                id="slider-g"
                type="range"
                min="0"
                max="255"
                value={g}
                onChange={(e) => handleRgbChange(r, parseInt(e.target.value, 10), b)}
                className="slider-g w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-b" className="text-muted-foreground text-xs">
                  B (Blue)
                </label>
                <span className="font-mono text-sm">{b}</span>
              </div>
              <input
                id="slider-b"
                type="range"
                min="0"
                max="255"
                value={b}
                onChange={(e) => handleRgbChange(r, g, parseInt(e.target.value, 10))}
                className="slider-b w-full"
              />
            </div>
          </div>
        </div>

        {/* HSL sliders */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">HSL</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-h" className="text-muted-foreground text-xs">
                  H° (Hue)
                </label>
                <span className="font-mono text-sm">{h}</span>
              </div>
              <input
                id="slider-h"
                type="range"
                min="0"
                max="360"
                value={h}
                onChange={(e) => handleHslChange(parseInt(e.target.value, 10), s, l)}
                className="slider-h w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-s" className="text-muted-foreground text-xs">
                  S% (Saturation)
                </label>
                <span className="font-mono text-sm">{s}</span>
              </div>
              <input
                id="slider-s"
                type="range"
                min="0"
                max="100"
                value={s}
                onChange={(e) => handleHslChange(h, parseInt(e.target.value, 10), l)}
                className="slider-s w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="slider-l" className="text-muted-foreground text-xs">
                  L% (Lightness)
                </label>
                <span className="font-mono text-sm">{l}</span>
              </div>
              <input
                id="slider-l"
                type="range"
                min="0"
                max="100"
                value={l}
                onChange={(e) => handleHslChange(h, s, parseInt(e.target.value, 10))}
                className="slider-l w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted p-3 text-left text-sm transition-colors hover:bg-muted"
      >
        <Palette className="h-4 w-4" />
        {isOpen ? "Hide" : "Show"} Harmony Colors
      </button>

      {/* Harmony colors - only in advanced mode */}
      {isOpen && (
        <div className="space-y-4 rounded-lg border border-border bg-muted p-4">
          {/* Complementary */}
          <div>
            <Label className="mb-2 block font-semibold text-xs">Complementary</Label>
            <button
              type="button"
              onClick={() => onAddColor?.(getComplementaryColor(value))}
              className="h-8 w-full rounded border-2 border-border transition-all hover:scale-105"
              style={{ backgroundColor: getComplementaryColor(value) }}
              title={getComplementaryColor(value)}
            />
          </div>

          {/* Triadic */}
          <div>
            <Label className="mb-2 block font-semibold text-xs">Triadic</Label>
            <div className="grid grid-cols-2 gap-2">
              {getTriadicColors(value).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onAddColor?.(color)}
                  className="h-8 rounded border-2 border-border transition-all hover:scale-105"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Analogous */}
          <div>
            <Label className="mb-2 block font-semibold text-xs">Analogous</Label>
            <div className="grid grid-cols-2 gap-2">
              {getAnalogousColors(value).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onAddColor?.(color)}
                  className="h-8 rounded border-2 border-border transition-all hover:scale-105"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
