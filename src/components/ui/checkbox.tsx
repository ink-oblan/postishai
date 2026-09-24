"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type" | "ref"> {
  indeterminate?: boolean;
}

function Checkbox({ className, indeterminate = false, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      className={cn(
        "h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
