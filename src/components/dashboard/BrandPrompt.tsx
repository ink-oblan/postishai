"use client";

import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BrandPromptProps {
  hasBrandProfile: boolean;
}

export function BrandPrompt({ hasBrandProfile }: BrandPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (hasBrandProfile || dismissed) {
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
          onClick={() => setDismissed(true)}
          className="mt-1 flex-shrink-0 text-amber-600/60 transition-colors hover:text-amber-700"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
