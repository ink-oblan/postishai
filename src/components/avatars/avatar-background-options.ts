import { COUNTRIES } from "@/lib/countries";
import { ETHNICITIES, ETHNICITY_EMOJI } from "@/lib/ethnicities";

export const ALL_BACKGROUND_OPTIONS: { display: string; value: string }[] = [
  ...ETHNICITIES.map((value) => ({ display: `${ETHNICITY_EMOJI} ${value}`, value })),
  ...COUNTRIES.map(({ emoji, country_name }) => ({
    display: `${emoji} ${country_name}`,
    value: country_name,
  })),
];
