"use client";

import { Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FontItem {
  id: string;
  name: string;
  source: "builtin" | "uploaded"; // builtin or custom file
  file?: File; // for uploaded fonts
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_selectedBuiltin, setSelectedBuiltin] = useState<string>("");
  const [fontSearch, setFontSearch] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const filteredBuiltins = useMemo(() => {
    return BUILTIN_FONTS.filter((font) =>
      font.name.toLowerCase().includes(fontSearch.toLowerCase()),
    ).filter((bf) => !fonts.some((f) => f.source === "builtin" && f.name === bf.name));
  }, [fontSearch, fonts]);

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
        setSelectedBuiltin("");
      }
    }
  };

  const addCustomFont = (file: File) => {
    if (fonts.length < maxFonts) {
      const newFont: FontItem = {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        source: "uploaded",
        file,
      };
      onChange([...fonts, newFont]);
    }
  };

  const removeFont = (id: string) => {
    onChange(fonts.filter((f) => f.id !== id));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Support: .ttf, .otf, .woff, .woff2
      const validTypes = ["font/ttf", "font/otf", "font/woff", "font/woff2"];
      const isValidFont =
        validTypes.includes(file.type) || file.name.match(/\.(ttf|otf|woff|woff2)$/i);

      if (isValidFont) {
        addCustomFont(file);
      } else {
        alert("Please upload a valid font file (.ttf, .otf, .woff, .woff2)");
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          fonts.map((font, _index) => (
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFont(font.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {fonts.length < maxFonts && (
        <div className="space-y-3 border-t pt-4">
          {/* Built-in fonts with search and selection */}
          <div className="space-y-2">
            <Label htmlFor="font-search" className="text-sm">
              Add from library
            </Label>
            <div className="relative">
              <Input
                id="font-search"
                type="text"
                placeholder="Search or select font..."
                value={fontSearch}
                onChange={(e) => {
                  setFontSearch(e.target.value);
                  setSelectedBuiltin("");
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="flex-1 text-sm"
              />
              {isFocused && filteredBuiltins.length > 0 && (
                <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-md border border-input bg-background shadow-lg">
                  {filteredBuiltins.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => {
                        addBuiltinFont(font.id);
                        setFontSearch("");
                        setIsFocused(false);
                      }}
                      className="w-full border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-muted"
                      style={{ fontFamily: getFontFamily(font.id) }}
                    >
                      <div className="text-sm">{font.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload custom font */}
          <div className="space-y-2">
            <Label htmlFor="font-upload" className="text-sm">
              Upload custom font
            </Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-border border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="font-medium text-sm">Click to upload</p>
              <p className="text-muted-foreground text-xs">TTF, OTF, WOFF, or WOFF2</p>
            </div>
            <input
              ref={fileInputRef}
              id="font-upload"
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
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
