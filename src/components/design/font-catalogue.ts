"use client";

import {
  BUILTIN_FONTS,
  builtinFontFamily,
  getBuiltinFontByName,
} from "@/app/(app)/brand/lib/builtin-fonts";
import type { FontChoice } from "@/components/design/LayerInspector";
import { FALLBACK_FONT_FAMILY, uploadedFontFamily } from "@/lib/design/fonts";

/**
 * Documents store the human font name ("Playfair Display"), never the CSS family. next/font
 * hashes its family names per build, so a stored family would stop resolving after a deploy.
 */
export function resolveFontFamily(name: string): string {
  if (name.startsWith("brandfont-")) return name;

  const builtin = getBuiltinFontByName(name);
  return builtin ? builtinFontFamily(builtin) : `${name}, ${FALLBACK_FONT_FAMILY}`;
}

export function builtinFontChoices(): FontChoice[] {
  return BUILTIN_FONTS.map((font) => ({ name: font.name, family: font.name }));
}

export function uploadedFontChoice(assetId: string, name: string): FontChoice {
  return { name, family: uploadedFontFamily(assetId) };
}
