"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { RemoveButton } from "@/components/ui/cross-remove-button";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Label } from "@/components/ui/label";
import { BRAND_ASSET_EXTENSIONS, MAX_BRAND_ASSET_SIZE_BYTES } from "@/lib/brand-assets";
import {
  BUILTIN_FONTS,
  builtinFontFamily,
  getBuiltinFontById,
  getBuiltinFontByName,
} from "../lib/builtin-fonts";

export interface FontItem {
  id: string;
  name: string;
  source: "builtin" | "uploaded";
  /** Storage path of the uploaded font file; unset for library fonts. */
  storagePath?: string;
}

interface TypographyPickerProps {
  fonts: FontItem[];
  onChange: (fonts: FontItem[]) => void;
  maxFonts?: number;
}

export function TypographyPicker({ fonts, onChange, maxFonts = 3 }: TypographyPickerProps) {
  const [fontSearch, setFontSearch] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [customFontFiles, setCustomFontFiles] = useState<UploadedFile[]>([]);

  const addBuiltinFont = (builtinId: string) => {
    if (fonts.length >= maxFonts) return;
    const builtinFont = getBuiltinFontById(builtinId);
    if (!builtinFont) return;

    onChange([
      ...fonts,
      { id: Math.random().toString(36).slice(2), name: builtinFont.name, source: "builtin" },
    ]);
  };

  const filteredBuiltins = useMemo(() => {
    return BUILTIN_FONTS.filter((font) =>
      font.name.toLowerCase().includes(fontSearch.toLowerCase()),
    ).filter((bf) => !fonts.some((f) => f.source === "builtin" && f.name === bf.name));
  }, [fontSearch, fonts]);

  const removeFont = (id: string) => {
    onChange(fonts.filter((f) => f.id !== id));
  };

  const handleCustomFontFilesChange = (newFiles: UploadedFile[]) => {
    setCustomFontFiles(newFiles);
    // Add new fonts from the uploaded files
    const newFonts = newFiles
      .filter((f) => !fonts.some((font) => font.name === f.name && font.source === "uploaded"))
      .map((f) => ({
        id: f.id,
        name: f.name,
        source: "uploaded" as const,
        storagePath: f.storagePath,
      }));

    if (newFonts.length > 0 && fonts.length + newFonts.length <= maxFonts) {
      onChange([...fonts, ...newFonts]);
      setCustomFontFiles([]);
    }
  };

  const isValid = fonts.length >= 1;

  return (
    <div className="space-y-2">
      <Label>
        Typefaces <span className="text-destructive">*</span>
      </Label>

      <div
        className={`rounded-lg border p-4 ${
          isValid ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <p className="text-muted-foreground text-xs">
            Select from our library or upload your own font files
          </p>
          {isValid ? (
            <CheckCircle2
              className="ml-2 h-5 w-5 flex-shrink-0 text-green-500"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle className="ml-2 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-4">
          {/* Selected fonts */}
          <div className="space-y-2">
            {fonts.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No fonts selected yet</p>
            ) : (
              fonts.map((font) => (
                <div
                  key={font.id}
                  className="flex items-center justify-between rounded-md bg-muted p-3"
                  style={
                    font.source === "builtin"
                      ? { fontFamily: builtinFontFamily(getBuiltinFontByName(font.name)) }
                      : undefined
                  }
                >
                  <div className="flex-1">
                    <div className="font-medium">{font.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {font.source === "builtin" ? "From library" : "Custom font"}
                    </div>
                  </div>
                  <RemoveButton onClick={() => removeFont(font.id)} aria-label="Remove this font" />
                </div>
              ))
            )}
          </div>

          {fonts.length < maxFonts && (
            <div className="space-y-3 border-t pt-4">
              {/* Built-in fonts with search and selection */}
              <div className="space-y-2">
                <Label className="text-sm">Add from library</Label>
                <Combobox
                  inputValue={fontSearch}
                  onInputValueChange={setFontSearch}
                  open={isFocused}
                  onOpenChange={setIsFocused}
                >
                  <ComboboxInputGroup>
                    <ComboboxInput placeholder="Search or select font..." />
                  </ComboboxInputGroup>
                  <ComboboxContent className="max-h-40">
                    {filteredBuiltins.length > 0 ? (
                      filteredBuiltins.map((font) => (
                        <ComboboxItem
                          key={font.id}
                          value={font.id}
                          onClick={() => {
                            addBuiltinFont(font.id);
                            setFontSearch("");
                            setIsFocused(false);
                          }}
                        >
                          <span style={{ fontFamily: builtinFontFamily(font) }}>{font.name}</span>
                        </ComboboxItem>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-center text-muted-foreground text-sm">
                        No fonts found
                      </div>
                    )}
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Upload custom font using FileUploader */}
              <FileUploader
                files={customFontFiles}
                onFilesChange={handleCustomFontFilesChange}
                label="Upload custom font"
                description="Upload TTF, OTF, WOFF, or WOFF2 font files"
                acceptedExtensions={BRAND_ASSET_EXTENSIONS.font}
                maxFiles={maxFonts - fonts.length}
                maxFileSizeBytes={MAX_BRAND_ASSET_SIZE_BYTES.font}
                required={false}
                fileType="font"
              />
            </div>
          )}

          {/* Info hint */}
          <div
            className={`space-y-1 pt-2 text-center text-xs ${
              isValid ? "text-muted-foreground" : "font-medium text-red-500"
            }`}
          >
            <p>
              Add{" "}
              {1 - Math.min(fonts.length, 1) > 0
                ? `${1 - Math.min(fonts.length, 1)} more typeface${1 - Math.min(fonts.length, 1) > 1 ? "s" : ""}`
                : `up to ${maxFonts - fonts.length} more typeface${maxFonts - fonts.length > 1 ? "s" : ""}`}{" "}
              (1–{maxFonts} total)
            </p>
            <p className={isValid ? "text-xs opacity-75" : "text-red-500 text-xs"}>
              At least 1 typeface required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
