"use client";

import type { BrandProfile } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isStepValid } from "../lib/validation";
import { CoreBrand } from "./CoreBrand";
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

const STEPS = ["Core Brand", "Visual Identity", "Tone of Voice", "Video & Meaning"];

export function BrandSetupWizard({ initialData, userId }: BrandSetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
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

  useEffect(() => {
    const saved = localStorage.getItem("brandWizardStep");
    if (saved) {
      setCurrentStep(Math.min(parseInt(saved, 10), STEPS.length - 1));
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("brandWizardStep", String(currentStep));
  }, [currentStep]);

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

      localStorage.removeItem("brandWizardStep");
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
        {currentStep === 0 && <CoreBrand formData={formData} onUpdate={handleUpdateFormData} />}
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
