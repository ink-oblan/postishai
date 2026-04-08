"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark",  label: "Dark",  icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const activeTheme = mounted ? theme ?? "system" : undefined;
  const effectiveTheme = mounted ? resolvedTheme ?? "dark" : "dark";
  const helperText = activeTheme === "system"
    ? `Following system, currently ${effectiveTheme}`
    : `Currently ${effectiveTheme}`;

  return (
    <div className="w-full sm:w-auto">
      <div
        className="grid w-full grid-cols-3 gap-1 rounded-xl border border-border bg-muted/70 p-1 sm:w-auto"
        role="group"
        aria-label="Color theme"
      >
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={activeTheme === value}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:px-2.5 sm:py-1.5 ${
              activeTheme === value
                ? "border-border bg-background text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-right text-[11px] text-muted-foreground">
        {helperText}
      </p>
    </div>
  );
}
