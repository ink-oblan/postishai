"use client";

import type { BrandProfile } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type BrandFieldName,
  type BrandFormData,
  fieldStep,
  isBrandField,
  seedFormData,
} from "@/lib/brand-fields";
import { removeStorage } from "@/lib/safe-storage";
import {
  changedFields,
  draftKey,
  firstChangedStep,
  previousValues,
  readDraft,
  restorableChanges,
  writeDraft,
} from "../lib/draft";
import {
  apiFieldError,
  firstInvalidStep,
  stepValidation,
  type ValidationError,
  validateStep,
  withFieldError,
} from "../lib/validation";
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

const STEPS = ["Core Brand", "Visual Identity", "Tone of Voice", "Video & Meaning"];

/**
 * Brings a field into view and hands it the caret. Fields tag their own wrapper rather than
 * relying on the input's id, because two of them — the palette and the typefaces — are whole
 * pickers with no single input to point at.
 */
function focusField(field: BrandFieldName): void {
  const wrapper = document.querySelector<HTMLElement>(`[data-brand-field="${field}"]`);
  if (!wrapper) return;

  wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
  wrapper
    .querySelector<HTMLElement>("input, textarea, select, button")
    ?.focus({ preventScroll: true });
}

export function BrandSetupWizard({ initialData, userId }: BrandSetupWizardProps) {
  const router = useRouter();
  const storageKey = draftKey(userId, initialData?.id);
  const isEditing = initialData !== null;
  const savedFormData = useMemo(() => seedFormData(initialData), [initialData]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>(savedFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [attemptedSteps, setAttemptedSteps] = useState<ReadonlySet<number>>(new Set());
  const [pendingFocus, setPendingFocus] = useState<BrandFieldName | null>(null);
  const [rejectedField, setRejectedField] = useState<ValidationError | null>(null);

  const changes = useMemo(() => changedFields(formData, savedFormData), [formData, savedFormData]);

  // Only meaningful against a saved brand — on a new one every field starts empty, so
  // "changed" would just repeat what the field itself already shows.
  const fieldChanges = useMemo(
    () => (initialData ? previousValues(changes, savedFormData) : {}),
    [initialData, changes, savedFormData],
  );

  useEffect(() => {
    const draft = readDraft(storageKey);
    if (draft) {
      const restorable = restorableChanges(draft.changes);

      const resumeStep = (isEditing ? firstChangedStep(restorable) : null) ?? draft.step;
      if (resumeStep >= 0 && resumeStep < STEPS.length) {
        setCurrentStep(resumeStep);
      }

      const dropped = Object.keys(draft.changes).length - Object.keys(restorable).length;
      if (dropped > 0) {
        toast.warning(
          dropped === 1
            ? "An unsaved edit couldn't be restored"
            : `${dropped} unsaved edits couldn't be restored`,
          {
            description:
              "They were made on an older version of this form and no longer fit it. The saved brand is untouched.",
          },
        );
      }

      setFormData((prev) => ({ ...prev, ...restorable }));
    }

    setIsHydrated(true);
  }, [storageKey, isEditing]);

  useEffect(() => {
    // A save clears the draft; re-persisting on the way out would resurrect it.
    if (!isHydrated || isSaving) return;
    writeDraft(storageKey, { step: currentStep, changes });
  }, [storageKey, currentStep, changes, isHydrated, isSaving]);

  // Runs after the step it points at has rendered, so a jump between steps lands on the field.
  useEffect(() => {
    if (!pendingFocus) return;
    focusField(pendingFocus);
    setPendingFocus(null);
  }, [pendingFocus]);

  const markAttempted = (steps: number[]) => {
    setAttemptedSteps((prev) => new Set([...prev, ...steps]));
  };

  const handleNext = () => {
    const errors = validateStep(currentStep, formData);
    if (errors.length > 0) {
      markAttempted([currentStep]);
      setPendingFocus(errors[0].field);
      return;
    }

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

    if (rejectedField && rejectedField.field in updates) {
      setRejectedField(null);
    }
  };

  const handleSave = async () => {
    // Every step, not just this one — navigation no longer blocks on an unfinished step, so
    // the user can reach the end with a required field still empty two steps back.
    const invalidStep = firstInvalidStep(formData, STEPS.length);
    if (invalidStep !== null) {
      const [firstError] = validateStep(invalidStep, formData);
      markAttempted(STEPS.map((_, step) => step));
      setCurrentStep(invalidStep);
      setPendingFocus(firstError.field);

      if (invalidStep !== currentStep) {
        toast.error(`${STEPS[invalidStep]} isn't finished yet`, {
          description: firstError.message,
        });
      }
      return;
    }

    setIsSaving(true);
    setRejectedField(null);
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
        const { error, field } = await response.json().catch(() => ({ error: null, field: null }));
        const message = typeof error === "string" ? error : "Failed to save brand profile";

        if (typeof field === "string" && isBrandField(field)) {
          setRejectedField(apiFieldError(field, message));
          setCurrentStep(fieldStep(field));
          setPendingFocus(field);
          setIsSaving(false);
          return;
        }

        throw new Error(message);
      }

      removeStorage(storageKey);
      router.push("/brand");
      router.refresh();
    } catch (error) {
      console.error("Error saving brand profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save brand profile");
      setIsSaving(false);
    }
  };

  const validation = useMemo(
    () =>
      withFieldError(
        stepValidation(currentStep, formData, attemptedSteps.has(currentStep)),
        currentStep,
        rejectedField,
      ),
    [currentStep, formData, attemptedSteps, rejectedField],
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
        {currentStep === 0 && (
          <CoreBrand
            formData={formData}
            onUpdate={handleUpdateFormData}
            changes={fieldChanges}
            validation={validation}
          />
        )}
        {currentStep === 1 && (
          <Visual
            formData={formData}
            onUpdate={handleUpdateFormData}
            changes={fieldChanges}
            validation={validation}
          />
        )}
        {currentStep === 2 && (
          <Voice
            formData={formData}
            onUpdate={handleUpdateFormData}
            changes={fieldChanges}
            validation={validation}
          />
        )}
        {currentStep === 3 && (
          <Video
            formData={formData}
            onUpdate={handleUpdateFormData}
            changes={fieldChanges}
            validation={validation}
          />
        )}
      </div>

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
