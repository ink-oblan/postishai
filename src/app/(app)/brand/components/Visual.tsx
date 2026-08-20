"use client";

import { CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandFormData } from "./BrandSetupWizard";
import { type ColorItem, ColorPalettePicker } from "./ColorPalettePicker";
import { type FontItem, TypographyPicker } from "./TypographyPicker";

interface VisualProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function Visual({ formData, onUpdate }: VisualProps) {
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
      // Filter out file objects since they can't be serialized
      return parsed.map((f: FontItem) => ({
        ...f,
        file: undefined,
      }));
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
    const serializable = newFonts.map((f) => ({
      id: f.id,
      name: f.name,
      source: f.source,
      ...(f.data && { data: f.data }),
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
    console.log("[Visual] handleLogoChange:", newLogos);
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
    const json = JSON.stringify(persistedLogos);
    console.log("[Visual] Saving logoPath as JSON:", json);
    onUpdate({ logoPath: json });
  };

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
        <ColorPalettePicker colors={colors} onChange={handleColorsChange} />

        {/* Typography - Built-in fonts and custom font upload */}
        <TypographyPicker fonts={fonts} onChange={handleFontsChange} />

        {/* Photo Style */}
        {(() => {
          const hasText = (formData.photoStyle || "").trim().length > 0;
          return (
            <div className="space-y-2">
              <Label htmlFor="photoStyle">Photo Style</Label>
              <div className="relative">
                <Textarea
                  id="photoStyle"
                  placeholder="e.g., Bright and energetic, Minimalist, Dark and moody"
                  value={formData.photoStyle || ""}
                  onChange={(e) => onUpdate({ photoStyle: e.target.value })}
                  className={`pr-10 ${
                    hasText
                      ? "border-green-500 focus:ring-green-500"
                      : "border-border focus:ring-ring"
                  }`}
                  rows={2}
                />
                {hasText && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div
            className={`rounded-lg border p-4 ${
              logoFiles.length >= 1
                ? "border-green-500 bg-green-500/5"
                : "border-border bg-muted/20"
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Upload PNG logos that represent your brand. These will be used in generated content.
              </p>
              {logoFiles.length >= 1 ? (
                <CheckCircle2
                  className="ml-2 h-5 w-5 flex-shrink-0 text-green-500"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <FileUploader
              files={logoFiles}
              onFilesChange={handleLogoChange}
              acceptedExtensions={[".png"]}
              maxFiles={10}
              maxFileSizeBytes={50 * 1024 * 1024}
              required={false}
              fileType="logo"
            />
          </div>
        </div>

        {/* Patterns */}
        <div className="space-y-2">
          <Label>Patterns & Decorative Elements</Label>
          <div
            className={`rounded-lg border p-4 ${
              patternFiles.length >= 1
                ? "border-green-500 bg-green-500/5"
                : "border-border bg-muted/20"
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Upload PNG patterns and decorative elements to enhance your brand's visual identity.
              </p>
              {patternFiles.length >= 1 ? (
                <CheckCircle2
                  className="ml-2 h-5 w-5 flex-shrink-0 text-green-500"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <FileUploader
              files={patternFiles}
              onFilesChange={handlePatternChange}
              acceptedExtensions={[".png"]}
              maxFiles={10}
              maxFileSizeBytes={50 * 1024 * 1024}
              required={false}
              fileType="pattern"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
