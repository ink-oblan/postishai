import {
  type BrandFormData,
  brandFieldsForStep,
  type ColorItem,
  type FieldLimitError,
  isValidHexColor,
  validateFieldLimits,
} from "@/lib/brand-fields";

export type ValidationError = FieldLimitError;

/** Bad hex codes parse fine as list entries but aren't a colour the API will store. */
function validateColorHexes(colors: ColorItem[]): ValidationError | null {
  const invalid = colors.filter((color) => !isValidHexColor(color.hex)).length;
  if (invalid === 0) return null;

  return {
    field: "colors",
    message:
      invalid === 1
        ? "One colour isn't a valid hex code"
        : `${invalid} colours aren't valid hex codes`,
    current: colors.length - invalid,
    required: colors.length,
  };
}

export function validateStep(
  stepNumber: number,
  formData: Partial<BrandFormData>,
): ValidationError[] {
  return brandFieldsForStep(stepNumber).flatMap((field) => {
    const error = validateFieldLimits(field, formData[field]);
    if (error) return [error];

    if (field === "colors") {
      const hexError = validateColorHexes((formData.colors ?? []) as ColorItem[]);
      if (hexError) return [hexError];
    }

    return [];
  });
}

export function isStepValid(stepNumber: number, formData: Partial<BrandFormData>): boolean {
  return validateStep(stepNumber, formData).length === 0;
}
