import { parseList } from "./list-field";

export const VALIDATION_RULES = {
  brandName: {
    min: 3,
    max: 50,
    label: "Brand Name",
  },
  topic: {
    min: 3,
    max: 100,
    label: "Topic / Niche",
  },
  targetAudience: {
    min: 20,
    max: 500,
    label: "Target Audience",
  },
  mission: {
    min: 0, // Optional
    max: 500,
    label: "Mission & Values",
  },
  voiceStyle: {
    min: 0, // Optional
    max: 300,
    label: "Brand Voice Style",
  },
  brandVocabulary: {
    min: 0, // Optional
    max: 300,
    label: "Brand Vocabulary",
  },
  photoStyle: {
    min: 0, // Optional
    max: 200,
    label: "Photo Style",
  },
  patterns: {
    min: 0, // Optional
    max: 300,
    label: "Patterns & Decorative Elements",
  },
  videoAnimations: {
    min: 0, // Optional
    max: 300,
    label: "Video Animations",
  },
  videoTransitions: {
    min: 0, // Optional
    max: 300,
    label: "Video Transitions",
  },
  competitors: {
    min: 0, // Optional
    max: 500,
    label: "Competitors & Inspiration",
  },
};

export interface ValidationError {
  field: keyof typeof VALIDATION_RULES;
  message: string;
  current: number;
  required: number;
}

export function validateField(
  field: keyof typeof VALIDATION_RULES,
  value: string | undefined,
): ValidationError | null {
  const rules = VALIDATION_RULES[field];
  const length = (value || "").trim().length;

  if (rules.min > 0 && length < rules.min) {
    return {
      field,
      message: `${rules.label} must be at least ${rules.min} characters`,
      current: length,
      required: rules.min,
    };
  }

  if (length > rules.max) {
    return {
      field,
      message: `${rules.label} cannot exceed ${rules.max} characters`,
      current: length,
      required: rules.max,
    };
  }

  return null;
}

export function validateStep(
  stepNumber: number,
  formData: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const text = (field: string): string | undefined => {
    const value = formData[field];
    return typeof value === "string" ? value : undefined;
  };

  if (stepNumber === 0) {
    // Step 1: Required fields
    const requiredFields: (keyof typeof VALIDATION_RULES)[] = [
      "brandName",
      "topic",
      "targetAudience",
    ];

    requiredFields.forEach((field) => {
      const error = validateField(field, text(field));
      if (error) errors.push(error);
    });

    // Mission is optional, but validate if provided
    if (text("mission")?.trim()) {
      const error = validateField("mission", text("mission"));
      if (error) errors.push(error);
    }
  }

  if (stepNumber === 1) {
    // Step 2: at least a primary and a secondary colour, and one typeface
    const colors = parseList(formData.colors);
    if (colors.length < 2) {
      errors.push({
        field: "brandName",
        message: "Add at least 2 colors (Primary and Secondary)",
        current: colors.length,
        required: 2,
      });
    }

    const fonts = parseList(formData.typography);
    if (fonts.length < 1) {
      errors.push({
        field: "brandName",
        message: "Select at least 1 typeface",
        current: fonts.length,
        required: 1,
      });
    }
  }

  if (stepNumber === 2) {
    // Step 3: Optional fields
    const optionalFields: (keyof typeof VALIDATION_RULES)[] = ["voiceStyle", "brandVocabulary"];

    optionalFields.forEach((field) => {
      if (text(field)?.trim()) {
        const error = validateField(field, text(field));
        if (error) errors.push(error);
      }
    });
  }

  return errors;
}

export function isStepValid(stepNumber: number, formData: Record<string, unknown>): boolean {
  const errors = validateStep(stepNumber, formData);
  return errors.length === 0;
}
