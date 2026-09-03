import {
  type BrandFieldError,
  type BrandFieldName,
  type BrandFormData,
  brandFieldsForStep,
  type ColorItem,
  isValidHexColor,
  validateField,
} from "@/lib/brand-fields";

export type ValidationError = BrandFieldError;

export type FieldErrors = Partial<Record<BrandFieldName, ValidationError>>;

/**
 * What a step's fields are showing right now. `errors` is the whole truth about the step;
 * `showIncomplete` is how much of it the user is being told, and flips once they try to move on.
 */
export interface StepValidation {
  errors: FieldErrors;
  showIncomplete: boolean;
}

/** Bad hex codes parse fine as list entries but aren't a colour the API will store. */
function validateColorHexes(colors: ColorItem[]): ValidationError | null {
  const invalid = colors.filter((color) => !isValidHexColor(color.hex)).length;
  if (invalid === 0) return null;

  return {
    field: "colors",
    kind: "invalid",
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
    const error = validateField(field, formData[field]);
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

export function stepValidation(
  stepNumber: number,
  formData: Partial<BrandFormData>,
  showIncomplete: boolean,
): StepValidation {
  const errors: FieldErrors = {};
  for (const error of validateStep(stepNumber, formData)) {
    errors[error.field] = error;
  }

  return { errors, showIncomplete };
}

/** The one error a field is showing, or nothing while it is still only unfinished. */
export function shownError(
  validation: StepValidation | undefined,
  field: BrandFieldName,
): ValidationError | null {
  const error = validation?.errors[field];
  if (!error) return null;
  return validation?.showIncomplete || error.kind === "invalid" ? error : null;
}

/**
 * The earliest step the form can't get past. Saving checks all of them, not just the last one:
 * navigation no longer blocks on an unfinished step, so the user can reach the end with a
 * required field still empty two steps back.
 */
export function firstInvalidStep(
  formData: Partial<BrandFormData>,
  totalSteps: number,
): number | null {
  for (let step = 0; step < totalSteps; step++) {
    if (!isStepValid(step, formData)) return step;
  }
  return null;
}
