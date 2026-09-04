"use client";

import { Pipette } from "lucide-react";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    EyeDropper?: {
      new (): {
        open: () => Promise<{ sRGBHex: string }>;
      };
    };
  }
}

interface EyeDropperButtonProps {
  onPick: (hex: string) => void;
  className?: string;
  title?: string;
}

// Chromium on Linux/GNOME returns "rgba(r, g, b, a)" instead of a hex string here,
// despite the field being named sRGBHex (https://issues.chromium.org/issues/352218913).
function normalizeToHex(value: string): string {
  const hexMatch = value.match(/^#[0-9a-f]{3,8}$/i);
  if (hexMatch) return value;

  const rgbMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return (
      "#" +
      [r, g, b]
        .map((component) =>
          Math.max(0, Math.min(255, Number(component)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }

  return value;
}

export function EyeDropperButton({
  onPick,
  className = "",
  title = "Pick color from screen",
}: EyeDropperButtonProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      title={title}
      className={`flex-shrink-0 rounded border border-border bg-muted px-2 py-2 transition-colors hover:bg-muted/80 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        if (window.EyeDropper) {
          new window.EyeDropper()
            .open()
            .then((result) => onPick(normalizeToHex(result.sRGBHex)))
            .catch(() => {});
        }
      }}
    >
      <Pipette className="h-4 w-4" />
    </button>
  );
}
