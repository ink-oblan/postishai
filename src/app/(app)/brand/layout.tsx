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
 * Fonts offered by the typography picker. They are declared here rather than in the root
 * layout so only the brand routes pay for them — loading two dozen families app-wide adds
 * roughly a megabyte to every page for no benefit.
 *
 * Only weight 400 is requested: these are used to preview a typeface, not to set body copy.
 * Keep in sync with `./lib/builtin-fonts.ts`.
 */
const inter = Inter({
  variable: "--font-inter",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const roboto = Roboto({
  variable: "--font-roboto",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const poppins = Poppins({
  variable: "--font-poppins",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const lora = Lora({ variable: "--font-lora", weight: "400", subsets: ["latin"], display: "swap" });
const openSans = Open_Sans({
  variable: "--font-open-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const raleway = Raleway({
  variable: "--font-raleway",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const quicksand = Quicksand({
  variable: "--font-quicksand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const manrope = Manrope({
  variable: "--font-manrope",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const outfit = Outfit({
  variable: "--font-outfit",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const sora = Sora({ variable: "--font-sora", weight: "400", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun-dodum",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const josefinSans = Josefin_Sans({
  variable: "--font-josefin-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const brandFontVariables = [
  inter,
  roboto,
  poppins,
  playfairDisplay,
  montserrat,
  lora,
  openSans,
  raleway,
  spaceMono,
  ubuntu,
  cormorantGaramond,
  quicksand,
  manrope,
  outfit,
  dmSans,
  nunito,
  sora,
  sourceSerif,
  crimsonText,
  gowunDodum,
  varelaRound,
  josefinSans,
  ibmPlexSans,
  jetbrainsMono,
]
  .map((font) => font.variable)
  .join(" ");

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <div className={brandFontVariables}>{children}</div>;
}
