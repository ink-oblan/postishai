"use client";

import {
  BUILTIN_FONTS,
  builtinFontFamily,
  getBuiltinFontByName,
} from "@/app/(app)/brand/lib/builtin-fonts";
import {
  FALLBACK_FONT_FAMILY,
  type FontChoice,
  registerUploadedFont,
  uploadedFontFamily,
} from "@/lib/design/fonts";

/** Where an uploaded brand asset — a font file, the logo — is served from. */
export function brandAssetUrl(assetId: string): string {
  return `/api/brand-profile/file?id=${encodeURIComponent(assetId)}`;
}

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

export function registerBrandFont(assetId: string): Promise<void> {
  return registerUploadedFont(assetId, brandAssetUrl(assetId));
}
