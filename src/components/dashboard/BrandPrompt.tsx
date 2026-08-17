"use client";

import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BrandPromptProps {
  hasBrandProfile: boolean;
}

const DISMISS_KEY = "brand-prompt-dismissed";

export function BrandPrompt({ hasBrandProfile }: BrandPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedDismissed = localStorage.getItem(DISMISS_KEY) === "true";
    setDismissed(savedDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  // Don't render until hydrated to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  // Hide if brand profile exists (clear dismiss flag) or if user dismissed it
  if (hasBrandProfile) {
    localStorage.removeItem(DISMISS_KEY);
    return null;
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-50/50 p-6">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-950">Set up your brand profile</h3>
          <p className="mt-2 text-amber-900/80 text-sm leading-relaxed">
            Complete your brand profile to improve content quality and consistency. Add colors,
            fonts, tone of voice, and more to guide your content generation.
          </p>
          <div className="mt-4">
            <Link href="/brand">
              <Button size="sm" variant="default">
                Create Brand Profile
              </Button>
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-1 flex-shrink-0 text-amber-600/60 transition-colors hover:text-amber-700"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
