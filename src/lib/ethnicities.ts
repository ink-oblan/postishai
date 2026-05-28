export const ETHNICITY_EMOJI = "🌐";

export const ETHNICITIES = [
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
] as const;

export type Ethnicity = (typeof ETHNICITIES)[number];

export function isEthnicity(value: unknown): value is Ethnicity {
  return typeof value === "string" && (ETHNICITIES as readonly string[]).includes(value);
}
