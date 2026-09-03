"use client";

import { Input } from "@/components/ui/input";
import type { BrandFieldName } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import type { StepValidation } from "../lib/validation";
import { ValidatedField } from "./ValidatedField";

interface ValidatedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldName: BrandFieldName;
  required?: boolean;
  changes?: FieldChanges;
  validation?: StepValidation;
}

export function ValidatedInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  fieldName,
  required = false,
  changes,
  validation,
}: ValidatedInputProps) {
  return (
    <ValidatedField
      id={id}
      label={label}
      value={value}
      fieldName={fieldName}
      required={required}
      changes={changes}
      validation={validation}
    >
      {(className) => (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </ValidatedField>
  );
}
