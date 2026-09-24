"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect } from "react";
import { LongActionLoader } from "@/components/ui/long-action-loader";
import { cn } from "@/lib/utils";

const KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;

interface BlockingOverlayProps {
  active: boolean;
  title?: ReactNode;
  description?: ReactNode;
  elapsedSeconds?: number;
  estimate?: ReactNode;
  size?: ComponentProps<typeof LongActionLoader>["size"];
  className?: string;
}

export function BlockingOverlay({
  active,
  title,
  description,
  elapsedSeconds,
  estimate,
  size = "large",
  className,
}: BlockingOverlayProps) {
  useEffect(() => {
    if (!active) return;

    function swallow(event: KeyboardEvent) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    for (const type of KEY_EVENTS) window.addEventListener(type, swallow, true);
    return () => {
      for (const type of KEY_EVENTS) window.removeEventListener(type, swallow, true);
    };
  }, [active]);

  return (
    <div
      data-slot="blocking-overlay"
      data-active={active || undefined}
      aria-hidden={!active}
      className={cn(
        "absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-background/75 shadow-inner backdrop-blur-sm transition-opacity duration-200",
        active ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      <LongActionLoader
        title={title}
        description={description}
        elapsedSeconds={elapsedSeconds}
        estimate={estimate}
        size={size}
      />
    </div>
  );
}
