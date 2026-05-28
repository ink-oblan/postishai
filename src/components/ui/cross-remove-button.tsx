"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  "aria-label"?: string;
  className?: string;
}

export function RemoveButton({
  onClick,
  "aria-label": ariaLabel = "Remove",
  className = "",
}: RemoveButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`rounded-full bg-destructive/10 text-destructive shadow backdrop-blur-sm hover:bg-destructive/20 ${className}`}
    >
      <X />
    </Button>
  );
}
