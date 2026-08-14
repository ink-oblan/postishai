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
  formData: Record<string, string | undefined>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (stepNumber === 0) {
    // Step 1: Required fields
    const requiredFields: (keyof typeof VALIDATION_RULES)[] = [
      "brandName",
      "topic",
      "targetAudience",
    ];

    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) errors.push(error);
    });

    // Mission is optional, but validate if provided
    if (formData.mission && formData.mission.trim().length > 0) {
      const error = validateField("mission", formData.mission);
      if (error) errors.push(error);
    }
  }

  if (stepNumber === 1) {
    // Step 2: Color palette - must have at least 2 colors
    try {
      const colors = formData.colors ? JSON.parse(formData.colors) : [];
      if (!Array.isArray(colors) || colors.length < 2) {
        errors.push({
          field: "brandName",
          message: "Add at least 2 colors (Primary and Secondary)",
          current: colors.length || 0,
          required: 2,
        });
      }
    } catch {
      errors.push({
        field: "brandName",
        message: "Add at least 2 colors (Primary and Secondary)",
        current: 0,
        required: 2,
      });
    }

    // Step 2: Typography - must have at least 1 font
    try {
      const fonts = formData.typography ? JSON.parse(formData.typography) : [];
      if (!Array.isArray(fonts) || fonts.length < 1) {
        errors.push({
          field: "brandName",
          message: "Select at least 1 typeface",
          current: fonts.length || 0,
          required: 1,
        });
      }
    } catch {
      errors.push({
        field: "brandName",
        message: "Select at least 1 typeface",
        current: 0,
        required: 1,
      });
    }
  }

  if (stepNumber === 2) {
    // Step 3: Optional fields
    const optionalFields: (keyof typeof VALIDATION_RULES)[] = ["voiceStyle", "brandVocabulary"];

    optionalFields.forEach((field) => {
      if (formData[field] && formData[field]!.trim().length > 0) {
        const error = validateField(field, formData[field]);
        if (error) errors.push(error);
      }
    });
  }

  return errors;
}

export function isStepValid(
  stepNumber: number,
  formData: Record<string, string | undefined>,
): boolean {
  const errors = validateStep(stepNumber, formData);
  return errors.length === 0;
}
