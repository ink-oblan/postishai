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

export interface FontItem {
  id: string;
  name: string;
  source: "builtin" | "uploaded";
  data?: string; // base64 encoded font file
}

interface TypographyPickerProps {
  fonts: FontItem[];
  onChange: (fonts: FontItem[]) => void;
  maxFonts?: number;
}

const BUILTIN_FONTS = [
  { id: "inter", name: "Inter" },
  { id: "roboto", name: "Roboto" },
  { id: "poppins", name: "Poppins" },
  { id: "playfair", name: "Playfair Display" },
  { id: "montserrat", name: "Montserrat" },
  { id: "lora", name: "Lora" },
  { id: "opensans", name: "Open Sans" },
  { id: "raleway", name: "Raleway" },
  { id: "spacemono", name: "Space Mono" },
  { id: "ubuntu", name: "Ubuntu" },
  { id: "cormorant", name: "Cormorant Garamond" },
  { id: "quicksand", name: "Quicksand" },
  { id: "manrope", name: "Manrope" },
  { id: "outfit", name: "Outfit" },
  { id: "dm-sans", name: "DM Sans" },
  { id: "nunito", name: "Nunito" },
  { id: "sora", name: "Sora" },
  { id: "source-serif", name: "Source Serif Pro" },
  { id: "crimson", name: "Crimson Text" },
  { id: "gowun", name: "Gowun Dodum" },
  { id: "varela", name: "Varela Round" },
  { id: "josefin", name: "Josefin Sans" },
  { id: "ibm-plex", name: "IBM Plex Sans" },
  { id: "jetbrains", name: "JetBrains Mono" },
];

const FONT_FAMILY_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  poppins: "'Poppins', sans-serif",
  playfair: "'Playfair Display', serif",
  montserrat: "'Montserrat', sans-serif",
  lora: "'Lora', serif",
  opensans: "'Open Sans', sans-serif",
  raleway: "'Raleway', sans-serif",
  spacemono: "'Space Mono', monospace",
  ubuntu: "'Ubuntu', sans-serif",
  cormorant: "'Cormorant Garamond', serif",
  quicksand: "'Quicksand', sans-serif",
  manrope: "'Manrope', sans-serif",
  outfit: "'Outfit', sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  nunito: "'Nunito', sans-serif",
  sora: "'Sora', sans-serif",
  "source-serif": "'Source Serif Pro', serif",
  crimson: "'Crimson Text', serif",
  gowun: "'Gowun Dodum', sans-serif",
  varela: "'Varela Round', sans-serif",
  josefin: "'Josefin Sans', sans-serif",
  "ibm-plex": "'IBM Plex Sans', sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
};

function getFontFamily(fontId: string): string {
  return FONT_FAMILY_MAP[fontId] || "sans-serif";
}

function getFontIdByName(fontName: string): string {
  const font = BUILTIN_FONTS.find((f) => f.name === fontName);
  return font ? font.id : "";
}

export function TypographyPicker({ fonts, onChange, maxFonts = 3 }: TypographyPickerProps) {
  const [fontSearch, setFontSearch] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [customFontFiles, setCustomFontFiles] = useState<UploadedFile[]>([]);

  const addBuiltinFont = (builtinId: string) => {
    if (fonts.length < maxFonts) {
      const builtinFont = BUILTIN_FONTS.find((f) => f.id === builtinId);
      if (builtinFont) {
        const newFont: FontItem = {
          id: Math.random().toString(36).slice(2),
          name: builtinFont.name,
          source: "builtin",
        };
        onChange([...fonts, newFont]);
      }
    }
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
        data: f.previewUrl,
      }));

    if (newFonts.length > 0 && fonts.length + newFonts.length <= maxFonts) {
      onChange([...fonts, ...newFonts]);
      setCustomFontFiles([]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-3 block font-semibold text-base">
          Typefaces <span className="text-destructive">*</span>
        </Label>
        <p className="mb-4 text-muted-foreground text-sm">
          Select from our library or upload your own font files
        </p>
      </div>

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
                  ? { fontFamily: getFontFamily(getFontIdByName(font.name)) }
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
              <ComboboxContent>
                {filteredBuiltins.length > 0 ? (
                  filteredBuiltins.map((font) => (
                    <ComboboxItem
                      key={font.id}
                      value=""
                      onClick={() => {
                        addBuiltinFont(font.id);
                        setFontSearch("");
                        setIsFocused(false);
                      }}
                    >
                      <span style={{ fontFamily: getFontFamily(font.id) }}>{font.name}</span>
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
            acceptedExtensions={[".ttf", ".otf", ".woff", ".woff2"]}
            maxFiles={maxFonts - fonts.length}
            maxFileSizeBytes={50 * 1024 * 1024}
            required={false}
            fileType="font"
          />
        </div>
      )}

      {/* Info hint */}
      <div className="space-y-1 pt-2 text-center text-muted-foreground text-xs">
        <p>
          Add{" "}
          {1 - Math.min(fonts.length, 1) > 0
            ? `${1 - Math.min(fonts.length, 1)} more typeface${1 - Math.min(fonts.length, 1) > 1 ? "s" : ""}`
            : `up to ${maxFonts - fonts.length} more typeface${maxFonts - fonts.length > 1 ? "s" : ""}`}{" "}
          (1–{maxFonts} total)
        </p>
        <p className="text-xs opacity-75">At least 1 typeface required</p>
      </div>
    </div>
  );
}
