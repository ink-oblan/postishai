"use client";

import { Label } from "@/components/ui/label";
import { type BrandFieldName, fieldLimits } from "@/lib/brand-fields";
import { cn } from "@/lib/utils";
import type { FieldChanges } from "../lib/draft";
import type { StepValidation } from "../lib/validation";
import { FieldStatusIcon, fieldStatus, TONE_INPUT_CLASS } from "./FieldStatus";

interface ValidatedFieldProps {
  id: string;
  label: string;
  value: string;
  fieldName: BrandFieldName;
  required?: boolean;
  changes?: FieldChanges;
  validation?: StepValidation;
  multiline?: boolean;
  children: (className: string) => React.ReactNode;
}

export function ValidatedField({
  id,
  label,
  value,
  fieldName,
  required = false,
  changes,
  validation,
  multiline = false,
  children,
}: ValidatedFieldProps) {
  const rules = fieldLimits(fieldName);
  const length = value.length;
  const { tone, message } = fieldStatus(fieldName, { value, changes, validation });

  return (
    <div className="space-y-2" data-brand-field={fieldName}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        {children(`pr-10 ${tone === "neutral" ? "" : TONE_INPUT_CLASS[tone]}`)}
        <FieldStatusIcon
          tone={tone}
          field={fieldName}
          changes={changes}
          className={cn(
            "absolute right-3 items-center",
            multiline ? "top-3" : "top-1/2 -translate-y-1/2",
          )}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        {message ? (
          <span className="text-red-500">{message}</span>
        ) : (
          <span className="text-muted-foreground">
            {rules.min > 0 ? `${rules.min}–${rules.max} characters` : `Max ${rules.max} characters`}
          </span>
        )}
        <span className={length > rules.max ? "font-medium text-red-500" : "text-muted-foreground"}>
          {length} / {rules.max}
        </span>
      </div>
    </div>
  );
}
