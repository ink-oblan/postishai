"use client";

import { useRef, useState } from "react";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Label } from "@/components/ui/label";
import {
  BRAND_ASSET_EXTENSIONS,
  MAX_BRAND_ASSET_FILES_PER_REQUEST,
  MAX_BRAND_ASSET_SIZE_BYTES,
} from "@/lib/brand-assets";
import type { BrandAssetRef, BrandFormData, ColorItem, FontItem } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import { ColorPalettePicker } from "./ColorPalettePicker";
import { FieldStatusIcon, fieldTone, TONE_BLOCK_CLASS } from "./FieldStatus";
import { TypographyPicker } from "./TypographyPicker";
import { ValidatedTextarea } from "./ValidatedTextarea";

interface VisualProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
  changes?: FieldChanges;
}

function persistedAsset(file: UploadedFile): BrandAssetRef {
  return { id: file.id, name: file.name, assetId: file.assetId };
}

export function Visual({ formData, onUpdate, changes }: VisualProps) {
  const colorIdCounter = useRef(0);

  const normalizeColors = (parsed: ColorItem[]) => {
    return parsed.map((color) => ({
      ...color,
      id: color.id || `color-${++colorIdCounter.current}-${Date.now()}`,
    }));
  };

  const [colors, setColors] = useState<ColorItem[]>(() => normalizeColors(formData.colors ?? []));
  const [fonts, setFonts] = useState<FontItem[]>(() => formData.typography ?? []);
  const [patternFiles, setPatternFiles] = useState<UploadedFile[]>(() => formData.patterns ?? []);
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>(() => formData.logoPath ?? []);

  const handleColorsChange = (newColors: ColorItem[]) => {
    setColors(newColors);
    onUpdate({ colors: newColors });
  };

  const handleFontsChange = (newFonts: FontItem[]) => {
    setFonts(newFonts);
    // Persist the asset id of uploaded fonts, never the File or its blob: URL —
    // neither survives serialization or a page reload.
    onUpdate({
      typography: newFonts.map((f) => ({
        id: f.id,
        name: f.name,
        source: f.source,
        ...(f.assetId && { assetId: f.assetId }),
      })),
    });
  };

  const handlePatternChange = (newPatterns: UploadedFile[]) => {
    setPatternFiles(newPatterns);
    onUpdate({ patterns: newPatterns.map(persistedAsset) });
  };

  const handleLogoChange = (newLogos: UploadedFile[]) => {
    setLogoFiles(newLogos);
    onUpdate({ logoPath: newLogos.map(persistedAsset) });
  };

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
        <ValidatedTextarea
          id="photoStyle"
          label="Photo Style"
          value={formData.photoStyle || ""}
          onChange={(value) => onUpdate({ photoStyle: value })}
          placeholder="e.g., Bright and energetic, Minimalist, Dark and moody"
          fieldName="photoStyle"
          changes={changes}
          rows={2}
        />

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
