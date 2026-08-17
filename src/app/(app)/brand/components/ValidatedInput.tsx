"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VALIDATION_RULES } from "../lib/validation";

interface ValidatedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldName: keyof typeof VALIDATION_RULES;
  required?: boolean;
}

export function ValidatedInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  fieldName,
  required = false,
}: ValidatedInputProps) {
  const rules = VALIDATION_RULES[fieldName];
  const length = value.trim().length;
  const isValid = (rules.min === 0 && length === 0) || (length >= rules.min && length <= rules.max);
  const isTouched = length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-10 ${
            isTouched
              ? isValid
                ? "border-green-500 focus:ring-green-500"
                : "border-red-500 focus:ring-red-500"
              : ""
          }`}
        />
        {isTouched && (
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={isTouched && !isValid ? "text-red-500" : "text-muted-foreground"}>
          {rules.min > 0 ? `${rules.min}–${rules.max} characters` : `Max ${rules.max} characters`}
        </span>
        <span className={length > rules.max ? "font-medium text-red-500" : "text-muted-foreground"}>
          {length} / {rules.max}
        </span>
      </div>

      {isTouched && !isValid && (
        <p className="text-red-500 text-xs">
          {length < rules.min
            ? `Minimum ${rules.min} characters required (${rules.min - length} more)`
            : `Maximum ${rules.max} characters (${length - rules.max} too many)`}
        </p>
      )}
    </div>
  );
}
