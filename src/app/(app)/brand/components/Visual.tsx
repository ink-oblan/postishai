"use client";

import { useRef, useState } from "react";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BRAND_ASSET_EXTENSIONS,
  MAX_BRAND_ASSET_FILES_PER_REQUEST,
  MAX_BRAND_ASSET_SIZE_BYTES,
} from "@/lib/brand-assets";
import type { FieldChanges } from "../lib/draft";
import type { BrandFormData } from "./BrandSetupWizard";
import { type ColorItem, ColorPalettePicker } from "./ColorPalettePicker";
import { FieldStatusIcon, fieldTone, TONE_BLOCK_CLASS, TONE_INPUT_CLASS } from "./FieldStatus";
import { type FontItem, TypographyPicker } from "./TypographyPicker";

interface VisualProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
  changes?: FieldChanges;
}

export function Visual({ formData, onUpdate, changes }: VisualProps) {
  const colorIdCounter = useRef(0);

  const normalizeColors = (parsed: ColorItem[]) => {
    return parsed.map((color) => ({
      ...color,
      id: color.id || `color-${++colorIdCounter.current}-${Date.now()}`,
    }));
  };

  const [colors, setColors] = useState<ColorItem[]>(() => {
    if (!formData.colors) return [];
    try {
      const parsed =
        typeof formData.colors === "string"
          ? JSON.parse(formData.colors as string)
          : (formData.colors as unknown);
      return normalizeColors(parsed as ColorItem[]);
    } catch {
      return [];
    }
  });

  const [fonts, setFonts] = useState<FontItem[]>(() => {
    if (!formData.typography) return [];
    try {
      const parsed =
        typeof formData.typography === "string"
          ? JSON.parse(formData.typography as string)
          : (formData.typography as unknown);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((f: FontItem & { data?: string }) => {
        // `data` was the previous name for the uploaded font's storage path.
        const { data, ...font } = f;
        return { ...font, storagePath: font.storagePath ?? data };
      });
    } catch {
      return [];
    }
  });

  const [patternFiles, setPatternFiles] = useState<UploadedFile[]>(() => {
    if (!formData.patterns) return [];
    try {
      const parsed =
        typeof formData.patterns === "string"
          ? JSON.parse(formData.patterns as string)
          : (formData.patterns as unknown);
      if (!Array.isArray(parsed)) return [];
      return parsed as UploadedFile[];
    } catch {
      return [];
    }
  });

  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>(() => {
    if (!formData.logoPath) return [];
    try {
      const parsed =
        typeof formData.logoPath === "string"
          ? JSON.parse(formData.logoPath as string)
          : (formData.logoPath as unknown);
      if (!Array.isArray(parsed)) return [];
      return parsed as UploadedFile[];
    } catch {
      return [];
    }
  });

  const handleColorsChange = (newColors: ColorItem[]) => {
    setColors(newColors);
    onUpdate({ colors: JSON.stringify(newColors) });
  };

  const handleFontsChange = (newFonts: FontItem[]) => {
    setFonts(newFonts);
    // Persist the storage path of uploaded fonts, never the File or its blob: URL —
    // neither survives serialization or a page reload.
    const serializable = newFonts.map((f) => ({
      id: f.id,
      name: f.name,
      source: f.source,
      ...(f.storagePath && { storagePath: f.storagePath }),
    }));
    onUpdate({ typography: JSON.stringify(serializable) });
  };

  const handlePatternChange = (newPatterns: UploadedFile[]) => {
    setPatternFiles(newPatterns);
    // Only store essential fields for persistence
    const persistedPatterns = newPatterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      storagePath: pattern.storagePath,
      width: pattern.width,
      height: pattern.height,
      willCrop: pattern.willCrop,
    }));
    onUpdate({ patterns: JSON.stringify(persistedPatterns) });
  };

  const handleLogoChange = (newLogos: UploadedFile[]) => {
    setLogoFiles(newLogos);
    // Only store essential fields for persistence: id, name, storagePath, width, height, willCrop
    // Don't store blob: URLs or File objects as they can't be serialized or persist across sessions
    const persistedLogos = newLogos.map((logo) => ({
      id: logo.id,
      name: logo.name,
      storagePath: logo.storagePath,
      width: logo.width,
      height: logo.height,
      willCrop: logo.willCrop,
    }));
    onUpdate({ logoPath: JSON.stringify(persistedLogos) });
  };

  const photoStyleTone = fieldTone({
    changed: Boolean(changes?.photoStyle),
    filled: (formData.photoStyle || "").trim().length > 0,
  });

  const logoTone = fieldTone({
    changed: Boolean(changes?.logoPath),
    filled: logoFiles.length >= 1,
  });

  const patternsTone = fieldTone({
    changed: Boolean(changes?.patterns),
    filled: patternFiles.length >= 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Visual Identity</h2>
        <p className="text-muted-foreground">
          Define the visual elements that represent your brand
        </p>
      </div>

      <div className="space-y-4">
        {/* Color Palette */}
        <ColorPalettePicker colors={colors} onChange={handleColorsChange} changes={changes} />

        {/* Typography - Built-in fonts and custom font upload */}
        <TypographyPicker fonts={fonts} onChange={handleFontsChange} changes={changes} />

        {/* Photo Style */}
        <div className="space-y-2">
          <Label htmlFor="photoStyle">Photo Style</Label>
          <div className="relative">
            <Textarea
              id="photoStyle"
              placeholder="e.g., Bright and energetic, Minimalist, Dark and moody"
              value={formData.photoStyle || ""}
              onChange={(e) => onUpdate({ photoStyle: e.target.value })}
              className={`pr-10 ${TONE_INPUT_CLASS[photoStyleTone]}`}
              rows={2}
            />
            <FieldStatusIcon
              tone={photoStyleTone}
              field="photoStyle"
              changes={changes}
              className="absolute top-3 right-3"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[logoTone]}`}>
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Upload PNG logos that represent your brand. These will be used in generated content.
              </p>
              <FieldStatusIcon
                tone={logoTone}
                field="logoPath"
                changes={changes}
                className="ml-2"
              />
            </div>
            <FileUploader
              files={logoFiles}
              onFilesChange={handleLogoChange}
              acceptedExtensions={BRAND_ASSET_EXTENSIONS.logo}
              maxFiles={MAX_BRAND_ASSET_FILES_PER_REQUEST}
              maxFileSizeBytes={MAX_BRAND_ASSET_SIZE_BYTES.logo}
              required={false}
              fileType="logo"
            />
          </div>
        </div>

        {/* Patterns */}
        <div className="space-y-2">
          <Label>Patterns & Decorative Elements</Label>
          <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[patternsTone]}`}>
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Upload PNG patterns and decorative elements to enhance your brand's visual identity.
              </p>
              <FieldStatusIcon
                tone={patternsTone}
                field="patterns"
                changes={changes}
                className="ml-2"
              />
            </div>
            <FileUploader
              files={patternFiles}
              onFilesChange={handlePatternChange}
              acceptedExtensions={BRAND_ASSET_EXTENSIONS.pattern}
              maxFiles={MAX_BRAND_ASSET_FILES_PER_REQUEST}
              maxFileSizeBytes={MAX_BRAND_ASSET_SIZE_BYTES.pattern}
              required={false}
              fileType="pattern"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
