"use client";

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
import { type FontItem, fieldLimits } from "@/lib/brand-fields";
import {
  BUILTIN_FONTS,
  builtinFontFamily,
  getBuiltinFontById,
  getBuiltinFontByName,
} from "../lib/builtin-fonts";
import type { FieldChanges } from "../lib/draft";
import { FieldStatusIcon, fieldTone, TONE_BLOCK_CLASS } from "./FieldStatus";

interface TypographyPickerProps {
  fonts: FontItem[];
  onChange: (fonts: FontItem[]) => void;
  maxFonts?: number;
  changes?: FieldChanges;
}

export function TypographyPicker({
  fonts,
  onChange,
  maxFonts = fieldLimits("typography").max,
  changes,
}: TypographyPickerProps) {
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
        assetId: f.assetId,
      }));

    if (newFonts.length > 0 && fonts.length + newFonts.length <= maxFonts) {
      onChange([...fonts, ...newFonts]);
      setCustomFontFiles([]);
    }
  };

  const minFonts = fieldLimits("typography").min;
  const missing = Math.max(minFonts - fonts.length, 0);
  const isValid = missing === 0;
  const tone = fieldTone({
    invalid: !isValid,
    changed: Boolean(changes?.typography),
    filled: true,
  });

  return (
    <div className="space-y-2">
      <Label>
        Typefaces <span className="text-destructive">*</span>
      </Label>

      <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[tone]}`}>
        <div className="mb-4 flex items-start justify-between">
          <p className="text-muted-foreground text-xs">
            Select from our library or upload your own font files
          </p>
          <FieldStatusIcon tone={tone} field="typography" changes={changes} className="ml-2" />
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
                  value={null}
                  onValueChange={(builtinId) => {
                    if (builtinId) addBuiltinFont(builtinId);
                  }}
                  inputValue={fontSearch}
                  onInputValueChange={(value, details) => {
                    // Base UI mirrors the picked item into the input on selection; the picked
                    // font moves to the list above instead, so leave the search box empty.
                    setFontSearch(details.reason === "item-press" ? "" : value);
                  }}
                  open={isFocused}
                  onOpenChange={setIsFocused}
                >
                  <ComboboxInputGroup>
                    <ComboboxInput placeholder="Search or select font..." />
                  </ComboboxInputGroup>
                  <ComboboxContent className="max-h-40">
                    {filteredBuiltins.length > 0 ? (
                      filteredBuiltins.map((font) => (
                        <ComboboxItem key={font.id} value={font.id}>
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
              {missing > 0
                ? `${missing} more typeface${missing > 1 ? "s" : ""}`
                : `up to ${maxFonts - fonts.length} more typeface${maxFonts - fonts.length === 1 ? "" : "s"}`}{" "}
              ({minFonts}–{maxFonts} total)
            </p>
            <p className={isValid ? "text-xs opacity-75" : "text-red-500 text-xs"}>
              At least {minFonts} typeface{minFonts === 1 ? "" : "s"} required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
