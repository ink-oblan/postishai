"use client";

import type { BrandProfile } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isStepValid } from "../lib/validation";
import { Required } from "./Required";
import { Video } from "./Video";
import { Visual } from "./Visual";
import { Voice } from "./Voice";
import { WizardNavigation } from "./WizardNavigation";
import { WizardProgress } from "./WizardProgress";

interface BrandSetupWizardProps {
  initialData: BrandProfile | null;
  userId: string;
}

export type BrandFormData = Partial<
  Omit<BrandProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;

const STEPS = ["Required Info", "Visual Identity", "Tone of Voice", "Video & Meaning"];

export function BrandSetupWizard({ initialData, userId }: BrandSetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BrandFormData>({
    brandName: initialData?.brandName || "",
    mission: initialData?.mission || "",
    targetAudience: initialData?.targetAudience || "",
    topic: initialData?.topic || "",
    colors: initialData?.colors || "",
    typography: initialData?.typography || "",
    logoPath: initialData?.logoPath || "",
    patterns: initialData?.patterns || "",
    photoStyle: initialData?.photoStyle || "",
    voiceStyle: initialData?.voiceStyle || "",
    youFormality: initialData?.youFormality || false,
    emojiLevel: initialData?.emojiLevel || 1,
    brandVocabulary: initialData?.brandVocabulary || "",
    videoAnimations: initialData?.videoAnimations || "",
    videoTransitions: initialData?.videoTransitions || "",
  });
  const [isSaving, setIsSaving] = useState(false);

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
          userId,
          brandProfileId: initialData?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save brand profile");
      }

      router.push("/brand");
    } catch (error) {
      console.error("Error saving brand profile:", error);
      alert("Failed to save brand profile");
      setIsSaving(false);
    }
  };

  const isCurrentStepValid = isStepValid(
    currentStep,
    formData as Record<string, string | undefined>,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <WizardProgress currentStep={currentStep} steps={STEPS} />

      <div className="mt-8 min-h-96 rounded-lg border border-border bg-card p-8">
        {currentStep === 0 && <Required formData={formData} onUpdate={handleUpdateFormData} />}
        {currentStep === 1 && <Visual formData={formData} onUpdate={handleUpdateFormData} />}
        {currentStep === 2 && <Voice formData={formData} onUpdate={handleUpdateFormData} />}
        {currentStep === 3 && <Video formData={formData} onUpdate={handleUpdateFormData} />}
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
