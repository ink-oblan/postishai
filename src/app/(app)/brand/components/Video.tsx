"use client";

import type { BrandFormData } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import type { StepValidation } from "../lib/validation";
import { ValidatedTextarea } from "./ValidatedTextarea";

interface VideoProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
  changes?: FieldChanges;
  validation?: StepValidation;
}

export function Video({ formData, onUpdate, changes, validation }: VideoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Video Style & Meaning</h2>
        <p className="text-muted-foreground">Define your video aesthetics and brand meaning</p>
      </div>

      <div className="space-y-6">
        <ValidatedTextarea
          id="animations"
          label="Video Animations"
          value={formData.videoAnimations || ""}
          onChange={(value) => onUpdate({ videoAnimations: value })}
          placeholder="e.g., Smooth fade-ins, Kinetic text animations, Minimal transitions"
          fieldName="videoAnimations"
          changes={changes}
          validation={validation}
          rows={2}
        />

        <ValidatedTextarea
          id="transitions"
          label="Video Transitions"
          value={formData.videoTransitions || ""}
          onChange={(value) => onUpdate({ videoTransitions: value })}
          placeholder="e.g., Cross fade, Slide left, Zoom in, Cut"
          fieldName="videoTransitions"
          changes={changes}
          validation={validation}
          rows={2}
        />

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
