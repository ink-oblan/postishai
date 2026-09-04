import {
  Cormorant_Garamond,
  Crimson_Text,
  DM_Sans,
  Gowun_Dodum,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Josefin_Sans,
  Lora,
  Manrope,
  Montserrat,
  Nunito,
  Open_Sans,
  Outfit,
  Playfair_Display,
  Poppins,
  Quicksand,
  Raleway,
  Roboto,
  Sora,
  Source_Serif_4,
  Space_Mono,
  Ubuntu,
  Varela_Round,
} from "next/font/google";

/**
 * Catalogue of the fonts a brand can pick from the library.
 *
 * next/font requires every loader call to be a top-level `const` with literal options, so the
 * calls below can't be generated from the catalogue. They are referenced nowhere else though:
 * adding a font means adding one `const` here plus one entry in `BUILTIN_FONTS`, and an unused
 * `const` is the only way to get it wrong.
 *
 * Only weight 400 is requested: these are used to preview a typeface, not to set body copy.
 * The fonts ship with whatever imports this module, so the rest of the app doesn't pay for them.
 */
const inter = Inter({ weight: "400", subsets: ["latin"], display: "swap" });
const roboto = Roboto({ weight: "400", subsets: ["latin"], display: "swap" });
const poppins = Poppins({ weight: "400", subsets: ["latin"], display: "swap" });
const playfairDisplay = Playfair_Display({ weight: "400", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ weight: "400", subsets: ["latin"], display: "swap" });
const lora = Lora({ weight: "400", subsets: ["latin"], display: "swap" });
const openSans = Open_Sans({ weight: "400", subsets: ["latin"], display: "swap" });
const raleway = Raleway({ weight: "400", subsets: ["latin"], display: "swap" });
const spaceMono = Space_Mono({ weight: "400", subsets: ["latin"], display: "swap" });
const ubuntu = Ubuntu({ weight: "400", subsets: ["latin"], display: "swap" });
const cormorantGaramond = Cormorant_Garamond({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const quicksand = Quicksand({ weight: "400", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ weight: "400", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ weight: "400", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ weight: "400", subsets: ["latin"], display: "swap" });
const nunito = Nunito({ weight: "400", subsets: ["latin"], display: "swap" });
const sora = Sora({ weight: "400", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({ weight: "400", subsets: ["latin"], display: "swap" });
const crimsonText = Crimson_Text({ weight: "400", subsets: ["latin"], display: "swap" });
const gowunDodum = Gowun_Dodum({ weight: "400", subsets: ["latin"], display: "swap" });
const varelaRound = Varela_Round({ weight: "400", subsets: ["latin"], display: "swap" });
const josefinSans = Josefin_Sans({ weight: "400", subsets: ["latin"], display: "swap" });
const ibmPlexSans = IBM_Plex_Sans({ weight: "400", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ weight: "400", subsets: ["latin"], display: "swap" });

type LoadedFont = { style: { fontFamily: string } };

export interface BuiltinFont {
  id: string;
  name: string;
  fallback: "sans-serif" | "serif" | "monospace";
  font: LoadedFont;
}

export const BUILTIN_FONTS: readonly BuiltinFont[] = [
  { id: "inter", name: "Inter", fallback: "sans-serif", font: inter },
  { id: "roboto", name: "Roboto", fallback: "sans-serif", font: roboto },
  { id: "poppins", name: "Poppins", fallback: "sans-serif", font: poppins },
  { id: "playfair", name: "Playfair Display", fallback: "serif", font: playfairDisplay },
  { id: "montserrat", name: "Montserrat", fallback: "sans-serif", font: montserrat },
  { id: "lora", name: "Lora", fallback: "serif", font: lora },
  { id: "opensans", name: "Open Sans", fallback: "sans-serif", font: openSans },
  { id: "raleway", name: "Raleway", fallback: "sans-serif", font: raleway },
  { id: "spacemono", name: "Space Mono", fallback: "monospace", font: spaceMono },
  { id: "ubuntu", name: "Ubuntu", fallback: "sans-serif", font: ubuntu },
  { id: "cormorant", name: "Cormorant Garamond", fallback: "serif", font: cormorantGaramond },
  { id: "quicksand", name: "Quicksand", fallback: "sans-serif", font: quicksand },
  { id: "manrope", name: "Manrope", fallback: "sans-serif", font: manrope },
  { id: "outfit", name: "Outfit", fallback: "sans-serif", font: outfit },
  { id: "dm-sans", name: "DM Sans", fallback: "sans-serif", font: dmSans },
  { id: "nunito", name: "Nunito", fallback: "sans-serif", font: nunito },
  { id: "sora", name: "Sora", fallback: "sans-serif", font: sora },
  { id: "source-serif", name: "Source Serif", fallback: "serif", font: sourceSerif },
  { id: "crimson", name: "Crimson Text", fallback: "serif", font: crimsonText },
  { id: "gowun", name: "Gowun Dodum", fallback: "sans-serif", font: gowunDodum },
  { id: "varela", name: "Varela Round", fallback: "sans-serif", font: varelaRound },
  { id: "josefin", name: "Josefin Sans", fallback: "sans-serif", font: josefinSans },
  { id: "ibm-plex", name: "IBM Plex Sans", fallback: "sans-serif", font: ibmPlexSans },
  { id: "jetbrains", name: "JetBrains Mono", fallback: "monospace", font: jetbrainsMono },
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
  return `${font.font.style.fontFamily}, ${font.fallback}`;
}
