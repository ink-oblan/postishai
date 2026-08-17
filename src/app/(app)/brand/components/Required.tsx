"use client";

import type { BrandFormData } from "./BrandSetupWizard";
import { ValidatedInput } from "./ValidatedInput";
import { ValidatedTextarea } from "./ValidatedTextarea";

interface RequiredProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function Required({ formData, onUpdate }: RequiredProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Brand Basics</h2>
        <p className="text-muted-foreground">Core information about your brand</p>
      </div>

      <div className="space-y-5">
        <ValidatedInput
          id="brandName"
          label="Brand Name"
          value={formData.brandName || ""}
          onChange={(value) => onUpdate({ brandName: value })}
          placeholder="Your brand name"
          fieldName="brandName"
          required
        />

        <ValidatedInput
          id="topic"
          label="Topic / Niche"
          value={formData.topic || ""}
          onChange={(value) => onUpdate({ topic: value })}
          placeholder="e.g., Sustainable Fashion, Tech Education, Fitness"
          fieldName="topic"
          required
        />

        <ValidatedTextarea
          id="targetAudience"
          label="Target Audience"
          value={formData.targetAudience || ""}
          onChange={(value) => onUpdate({ targetAudience: value })}
          placeholder="Who are you trying to reach? Describe your ideal customer or follower."
          fieldName="targetAudience"
          rows={3}
          required
        />

        <ValidatedTextarea
          id="mission"
          label="Mission & Values"
          value={formData.mission || ""}
          onChange={(value) => onUpdate({ mission: value })}
          placeholder="What is your brand's purpose or main message?"
          fieldName="mission"
          rows={3}
        />
      </div>
    </div>
  );
}
