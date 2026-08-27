"use client";

import type { BrandProfile } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  changedFields,
  draftKey,
  previousValues,
  readDraft,
  restorableChanges,
  writeDraft,
} from "../lib/draft";
import { parseList } from "../lib/list-field";
import { isStepValid } from "../lib/validation";
import type { ColorItem } from "./ColorPalettePicker";
import { CoreBrand } from "./CoreBrand";
import type { FontItem } from "./TypographyPicker";
import { Video } from "./Video";
import type { BrandAssetRef } from "./Visual";
import { Visual } from "./Visual";
import { Voice } from "./Voice";
import { WizardNavigation } from "./WizardNavigation";
import { WizardProgress } from "./WizardProgress";

interface BrandSetupWizardProps {
  initialData: BrandProfile | null;
  userId: string;
}

/**
 * The Json columns come back from Prisma as `JsonValue`; the wizard works with the lists they
 * actually hold, and posts them as-is for the API to store.
 */
export type BrandFormData = Partial<
  Omit<
    BrandProfile,
    "id" | "userId" | "createdAt" | "updatedAt" | "colors" | "typography" | "logoPath" | "patterns"
  >
> & {
  colors?: ColorItem[];
  typography?: FontItem[];
  logoPath?: BrandAssetRef[];
  patterns?: BrandAssetRef[];
};

const STEPS = ["Core Brand", "Visual Identity", "Tone of Voice", "Video & Meaning"];

function seedFormData(initialData: BrandProfile | null): BrandFormData {
  return {
    brandName: initialData?.brandName || "",
    mission: initialData?.mission || "",
    targetAudience: initialData?.targetAudience || "",
    topic: initialData?.topic || "",
    colors: parseList<ColorItem>(initialData?.colors),
    typography: parseList<FontItem>(initialData?.typography),
    logoPath: parseList<BrandAssetRef>(initialData?.logoPath),
    patterns: parseList<BrandAssetRef>(initialData?.patterns),
    photoStyle: initialData?.photoStyle || "",
    voiceStyle: initialData?.voiceStyle || "",
    youFormality: initialData?.youFormality ?? false,
    // `??` not `||`: emoji level 0 ("None") is a valid saved choice.
    emojiLevel: initialData?.emojiLevel ?? 1,
    brandVocabulary: initialData?.brandVocabulary || "",
    videoAnimations: initialData?.videoAnimations || "",
    videoTransitions: initialData?.videoTransitions || "",
  };
}

export function BrandSetupWizard({ initialData, userId }: BrandSetupWizardProps) {
  const router = useRouter();
  const storageKey = draftKey(userId, initialData?.id);
  const savedFormData = useMemo(() => seedFormData(initialData), [initialData]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>(savedFormData);
  const [isSaving, setIsSaving] = useState(false);

  const changes = useMemo(
    () => changedFields(formData as Record<string, unknown>, savedFormData),
    [formData, savedFormData],
  );

  // Only meaningful against a saved brand — on a new one every field starts empty, so
  // "changed" would just repeat what the field itself already shows.
  const fieldChanges = useMemo(
    () => (initialData ? previousValues(changes, savedFormData) : {}),
    [initialData, changes, savedFormData],
  );

  useEffect(() => {
    const draft = readDraft(storageKey);
    if (draft) {
      if (draft.step >= 0 && draft.step < STEPS.length) {
        setCurrentStep(draft.step);
      }
      // Edits the form can no longer take are dropped here and never written back, so a
      // draft left by an older release settles into the current shape on first open.
      setFormData((prev) => ({ ...prev, ...restorableChanges(draft.changes, savedFormData) }));
    }

    setIsHydrated(true);
  }, [storageKey, savedFormData]);

  useEffect(() => {
    // A save clears the draft; re-persisting on the way out would resurrect it.
    if (!isHydrated || isSaving) return;
    writeDraft(storageKey, { step: currentStep, changes });
  }, [storageKey, currentStep, changes, isHydrated, isSaving]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdateFormData = (updates: Partial<BrandFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/brand-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          brandProfileId: initialData?.id,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error || "Failed to save brand profile");
      }

      localStorage.removeItem(storageKey);
      router.push("/brand");
      router.refresh();
    } catch (error) {
      console.error("Error saving brand profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save brand profile");
      setIsSaving(false);
    }
  };

  const isCurrentStepValid = isStepValid(currentStep, formData);

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" />
          <div className="h-96 rounded-lg border border-border bg-card p-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" style={{ minHeight: "100vh", overflow: "hidden" }}>
      <WizardProgress currentStep={currentStep} steps={STEPS} />

      <div className="mt-8 rounded-lg border border-border bg-card p-8">
        {currentStep === 0 && (
          <CoreBrand formData={formData} onUpdate={handleUpdateFormData} changes={fieldChanges} />
        )}
        {currentStep === 1 && (
          <Visual formData={formData} onUpdate={handleUpdateFormData} changes={fieldChanges} />
        )}
        {currentStep === 2 && (
          <Voice formData={formData} onUpdate={handleUpdateFormData} changes={fieldChanges} />
        )}
        {currentStep === 3 && (
          <Video formData={formData} onUpdate={handleUpdateFormData} changes={fieldChanges} />
        )}
      </div>

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSave={handleSave}
        isSaving={isSaving}
        isStepValid={isCurrentStepValid}
      />
    </div>
  );
}
