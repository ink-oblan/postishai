/**
 * Catalogue of the fonts a brand can pick from the library.
 *
 * `cssVariable` is the custom property that `src/app/(app)/brand/layout.tsx` binds via
 * `next/font/google`. Previews must go through the variable — the literal family name
 * ("Inter") does not resolve, because next/font emits a hashed family name.
 *
 * The fonts are loaded by the brand layout only, so the rest of the app doesn't pay for
 * them. Keep this list and the loader in `layout.tsx` in sync.
 */
export interface BuiltinFont {
  id: string;
  name: string;
  cssVariable: string;
  fallback: "sans-serif" | "serif" | "monospace";
}

export const BUILTIN_FONTS: readonly BuiltinFont[] = [
  { id: "inter", name: "Inter", cssVariable: "--font-inter", fallback: "sans-serif" },
  { id: "roboto", name: "Roboto", cssVariable: "--font-roboto", fallback: "sans-serif" },
  { id: "poppins", name: "Poppins", cssVariable: "--font-poppins", fallback: "sans-serif" },
  {
    id: "playfair",
    name: "Playfair Display",
    cssVariable: "--font-playfair-display",
    fallback: "serif",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    cssVariable: "--font-montserrat",
    fallback: "sans-serif",
  },
  { id: "lora", name: "Lora", cssVariable: "--font-lora", fallback: "serif" },
  { id: "opensans", name: "Open Sans", cssVariable: "--font-open-sans", fallback: "sans-serif" },
  { id: "raleway", name: "Raleway", cssVariable: "--font-raleway", fallback: "sans-serif" },
  { id: "spacemono", name: "Space Mono", cssVariable: "--font-space-mono", fallback: "monospace" },
  { id: "ubuntu", name: "Ubuntu", cssVariable: "--font-ubuntu", fallback: "sans-serif" },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    cssVariable: "--font-cormorant-garamond",
    fallback: "serif",
  },
  { id: "quicksand", name: "Quicksand", cssVariable: "--font-quicksand", fallback: "sans-serif" },
  { id: "manrope", name: "Manrope", cssVariable: "--font-manrope", fallback: "sans-serif" },
  { id: "outfit", name: "Outfit", cssVariable: "--font-outfit", fallback: "sans-serif" },
  { id: "dm-sans", name: "DM Sans", cssVariable: "--font-dm-sans", fallback: "sans-serif" },
  { id: "nunito", name: "Nunito", cssVariable: "--font-nunito", fallback: "sans-serif" },
  { id: "sora", name: "Sora", cssVariable: "--font-sora", fallback: "sans-serif" },
  {
    id: "source-serif",
    name: "Source Serif",
    cssVariable: "--font-source-serif",
    fallback: "serif",
  },
  { id: "crimson", name: "Crimson Text", cssVariable: "--font-crimson-text", fallback: "serif" },
  { id: "gowun", name: "Gowun Dodum", cssVariable: "--font-gowun-dodum", fallback: "sans-serif" },
  {
    id: "varela",
    name: "Varela Round",
    cssVariable: "--font-varela-round",
    fallback: "sans-serif",
  },
  {
    id: "josefin",
    name: "Josefin Sans",
    cssVariable: "--font-josefin-sans",
    fallback: "sans-serif",
  },
  {
    id: "ibm-plex",
    name: "IBM Plex Sans",
    cssVariable: "--font-ibm-plex-sans",
    fallback: "sans-serif",
  },
  {
    id: "jetbrains",
    name: "JetBrains Mono",
    cssVariable: "--font-jetbrains-mono",
    fallback: "monospace",
  },
];

const BY_ID = new Map(BUILTIN_FONTS.map((font) => [font.id, font]));
const BY_NAME = new Map(BUILTIN_FONTS.map((font) => [font.name, font]));

export function getBuiltinFontById(id: string): BuiltinFont | undefined {
  return BY_ID.get(id);
}

export function getBuiltinFontByName(name: string): BuiltinFont | undefined {
  return BY_NAME.get(name);
}

/** CSS `font-family` value for a catalogue font, or the generic fallback when unknown. */
export function builtinFontFamily(font: BuiltinFont | undefined): string {
  if (!font) return "sans-serif";
  return `var(${font.cssVariable}), ${font.fallback}`;
}
