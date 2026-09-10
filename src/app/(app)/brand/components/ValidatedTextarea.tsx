"use client";

import { Textarea } from "@/components/ui/textarea";
import type { BrandFieldName } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import type { StepValidation } from "../lib/validation";
import { ValidatedField } from "./ValidatedField";

interface ValidatedTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldName: BrandFieldName;
  rows?: number;
  required?: boolean;
  changes?: FieldChanges;
  validation?: StepValidation;
}

export function ValidatedTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  fieldName,
  rows = 3,
  required = false,
  changes,
  validation,
}: ValidatedTextareaProps) {
  return (
    <ValidatedField
      id={id}
      label={label}
      value={value}
      fieldName={fieldName}
      required={required}
      changes={changes}
      validation={validation}
      multiline
    >
      {(className) => (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
      )}
    </ValidatedField>
  );
}
