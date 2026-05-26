import { COUNTRIES } from "@/lib/countries";

export const ETHNICITIES = [
  "🌐 Eastern European",
  "🌐 Western European",
  "🌐 Mediterranean",
  "🌐 Scandinavian",
  "🌐 Middle Eastern",
  "🌐 South Asian",
  "🌐 East Asian",
  "🌐 Southeast Asian",
  "🌐 Central Asian",
  "🌐 Sub-Saharan African",
  "🌐 North African",
  "🌐 Latin American",
  "🌐 Caribbean",
  "🌐 North American",
  "🌐 Pacific Islander",
];

export const ALL_BACKGROUND_OPTIONS = [
  ...ETHNICITIES,
  ...COUNTRIES.map(({ emoji, country_name }) => `${emoji} ${country_name}`),
];
