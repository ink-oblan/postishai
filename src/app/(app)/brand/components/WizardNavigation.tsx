import { Button } from "@/components/ui/button";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSave: () => void;
  isSaving: boolean;
  isStepValid: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSave,
  isSaving,
  isStepValid,
}: WizardNavigationProps) {
  return (
    <div className="mt-8 flex justify-between gap-4">
      {currentStep > 0 && (
        <Button variant="outline" onClick={onPrev} className="min-w-32">
          Previous
        </Button>
      )}

      <div className="flex-1" />

      {currentStep === totalSteps - 1 ? (
        <Button
          onClick={onSave}
          disabled={isSaving || !isStepValid}
          className="min-w-32"
          title={!isStepValid ? "Please complete all required fields" : ""}
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!isStepValid}
          className="min-w-32"
          title={!isStepValid ? "Please complete all required fields before proceeding" : ""}
        >
          Next
        </Button>
      )}
    </div>
  );
}
