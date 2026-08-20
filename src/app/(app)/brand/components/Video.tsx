"use client";

import { CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandFormData } from "./BrandSetupWizard";

interface VideoProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function Video({ formData, onUpdate }: VideoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Video Style & Meaning</h2>
        <p className="text-muted-foreground">Define your video aesthetics and brand meaning</p>
      </div>

      <div className="space-y-6">
        {(() => {
          const hasAnimations = (formData.videoAnimations || "").trim().length > 0;
          return (
            <div className="space-y-2">
              <Label htmlFor="animations">Video Animations</Label>
              <div className="relative">
                <Textarea
                  id="animations"
                  placeholder="e.g., Smooth fade-ins, Kinetic text animations, Minimal transitions"
                  value={formData.videoAnimations || ""}
                  onChange={(e) => onUpdate({ videoAnimations: e.target.value })}
                  className={`pr-10 ${
                    hasAnimations
                      ? "border-green-500 focus:ring-green-500"
                      : "border-border focus:ring-ring"
                  }`}
                  rows={2}
                />
                {hasAnimations && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {(() => {
          const hasTransitions = (formData.videoTransitions || "").trim().length > 0;
          return (
            <div className="space-y-2">
              <Label htmlFor="transitions">Video Transitions</Label>
              <div className="relative">
                <Textarea
                  id="transitions"
                  placeholder="e.g., Cross fade, Slide left, Zoom in, Cut"
                  value={formData.videoTransitions || ""}
                  onChange={(e) => onUpdate({ videoTransitions: e.target.value })}
                  className={`pr-10 ${
                    hasTransitions
                      ? "border-green-500 focus:ring-green-500"
                      : "border-border focus:ring-ring"
                  }`}
                  rows={2}
                />
                {hasTransitions && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h4 className="font-semibold text-primary">Almost there!</h4>
          <p className="mt-1 text-muted-foreground text-sm">
            Review your brand profile and click "Save Profile" to complete setup.
          </p>
        </div>
      </div>
    </div>
  );
}
