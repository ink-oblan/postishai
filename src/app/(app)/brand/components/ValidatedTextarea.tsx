"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type BrandFieldName, fieldLimits } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import { FieldStatusIcon, fieldTone, TONE_INPUT_CLASS } from "./FieldStatus";

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
}: ValidatedTextareaProps) {
  const rules = fieldLimits(fieldName);
  const length = value.length;
  const isValid = (rules.min === 0 && length === 0) || (length >= rules.min && length <= rules.max);
  const isTouched = length > 0;
  const tone = fieldTone({
    invalid: isTouched && !isValid,
    changed: Boolean(changes?.[fieldName]),
    filled: isTouched,
  });

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`pr-10 ${tone === "neutral" ? "" : TONE_INPUT_CLASS[tone]}`}
        />
        <FieldStatusIcon
          tone={tone}
          field={fieldName}
          changes={changes}
          className="absolute top-3 right-3 items-center"
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        {isTouched && !isValid ? (
          <span className="text-red-500">
            {length < rules.min
              ? `Min ${rules.min} characters, ${rules.min - length} more needed`
              : `Max ${rules.max} characters, you have ${length}`}
          </span>
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
