import { COUNTRIES } from "@/lib/countries";

export const ETHNICITIES = {
  emoji: "🌐",
  list: [
    "Eastern European",
    "Western European",
    "Mediterranean",
    "Scandinavian",
    "Middle Eastern",
    "South Asian",
    "East Asian",
    "Southeast Asian",
    "Central Asian",
    "Sub-Saharan African",
    "North African",
    "Latin American",
    "Caribbean",
    "North American",
    "Pacific Islander",
  ],
};

export const ALL_BACKGROUND_OPTIONS: { display: string; value: string }[] = [
  ...ETHNICITIES.list.map((value) => ({ display: `${ETHNICITIES.emoji} ${value}`, value })),
  ...COUNTRIES.map(({ emoji, country_name }) => ({ display: `${emoji} ${country_name}`, value: country_name })),
];
