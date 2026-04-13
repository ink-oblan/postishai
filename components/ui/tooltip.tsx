"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  delay?: number;
  className?: string;
};

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 200,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        delay={delay}
        render={children}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={10} className="z-50">
          <TooltipPrimitive.Popup
            className={cn(
              "max-w-64 rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-[0.78rem] leading-snug text-card-foreground shadow-lg backdrop-blur-sm transition-[transform,opacity] duration-150 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              className
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
