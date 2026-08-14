"use client";

import { useState } from "react";

interface ColorPickerAdvancedProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  onAddColor?: (hex: string) => void;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join("")
      .toUpperCase()
  );
}

// Get complementary color (opposite on color wheel)
function getComplementaryColor(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

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

  return { h, s, l };
}

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): RGB {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Get triadic colors (120° apart on color wheel)
function getTriadicColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const triadic1 = hslToRgb((hsl.h + 1 / 3) % 1, hsl.s, hsl.l);
  const triadic2 = hslToRgb((hsl.h + 2 / 3) % 1, hsl.s, hsl.l);

  return [
    rgbToHex(triadic1.r, triadic1.g, triadic1.b),
    rgbToHex(triadic2.r, triadic2.g, triadic2.b),
  ];
}

// Get analogous colors (30° apart)
function getAnalogousColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const analogous1 = hslToRgb((hsl.h + 1 / 12) % 1, hsl.s, hsl.l);
  const analogous2 = hslToRgb((hsl.h - 1 / 12 + 1) % 1, hsl.s, hsl.l);

  return [
    rgbToHex(analogous1.r, analogous1.g, analogous1.b),
    rgbToHex(analogous2.r, analogous2.g, analogous2.b),
  ];
}

export function ColorPickerAdvanced({
  value,
  onChange,
  label = "Color",
  onAddColor,
}: ColorPickerAdvancedProps) {
  const [showHarmony, setShowHarmony] = useState(false);
  const rgb = hexToRgb(value);

  // Calculate if text should be light or dark on this color
  const luminance = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  const textColor = luminance > 128 ? "#000000" : "#FFFFFF";

  const _handleRgbChange = (channel: "r" | "g" | "b", val: number) => {
    const newRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, val)) };
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    onChange(newHex);
  };

  const complementary = getComplementaryColor(value);

  return (
    <div className="space-y-2">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>

      <div className="flex items-center gap-2">
        {/* Color sample with text */}
        <div
          className="flex h-12 flex-1 items-center justify-center rounded border border-border/50 font-medium text-xs transition-colors"
          style={{ backgroundColor: value, color: textColor }}
        >
          Sample
        </div>

        {/* Color picker */}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-12 flex-shrink-0 cursor-pointer rounded border border-input"
          title="Pick color"
        />
      </div>

      {/* Harmony suggestions */}
      <div className="space-y-2 border-border/50 border-t pt-2">
        <button
          type="button"
          onClick={() => setShowHarmony(!showHarmony)}
          className="flex w-full items-center justify-between px-0 py-0 text-left transition-opacity hover:opacity-70"
        >
          <p className="font-medium text-muted-foreground text-xs">Harmony Suggestions</p>
          <span className="text-muted-foreground text-xs">{showHarmony ? "−" : "+"}</span>
        </button>

        {showHarmony && (
          <div className="space-y-3 border-border/50 border-t pt-2">
            {/* Complementary */}
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs">Complementary</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onAddColor?.(complementary)}
                  className="h-8 rounded border-2 border-border ring-primary/50 transition-all hover:ring-2"
                  style={{ backgroundColor: complementary }}
                  title={`Click to add ${complementary}`}
                />
                <code className="text-center font-mono text-muted-foreground text-xs">
                  {complementary}
                </code>
              </div>
            </div>

            {/* Triadic */}
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs">Triadic</p>
              <div className="grid grid-cols-2 gap-2">
                {getTriadicColors(value).map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAddColor?.(color)}
                    className="h-8 rounded border-2 border-border ring-primary/50 transition-all hover:ring-2"
                    style={{ backgroundColor: color }}
                    title={`Click to add ${color}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {getTriadicColors(value).map((color, idx) => (
                  <code key={idx} className="text-center font-mono text-muted-foreground">
                    {color}
                  </code>
                ))}
              </div>
            </div>

            {/* Analogous */}
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs">Analogous</p>
              <div className="grid grid-cols-2 gap-2">
                {getAnalogousColors(value).map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAddColor?.(color)}
                    className="h-8 rounded border-2 border-border ring-primary/50 transition-all hover:ring-2"
                    style={{ backgroundColor: color }}
                    title={`Click to add ${color}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {getAnalogousColors(value).map((color, idx) => (
                  <code key={idx} className="text-center font-mono text-muted-foreground">
                    {color}
                  </code>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
