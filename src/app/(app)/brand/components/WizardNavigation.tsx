import { Button } from "@/components/ui/button";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSave,
  isSaving,
}: WizardNavigationProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      {currentStep > 0 && (
        <Button variant="outline" onClick={onPrev} className="min-w-32">
          Previous
        </Button>
      )}

      <div className="flex-1" />

      {/*
        Both buttons stay enabled: the click is what tells the wizard the user considers the step
        finished, which is when it starts marking the fields that aren't. A disabled button would
        leave nothing to press and nothing to explain why.
      */}
      {currentStep === totalSteps - 1 ? (
        <Button onClick={onSave} disabled={isSaving} className="min-w-32">
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      ) : (
        <Button onClick={onNext} className="min-w-32">
          Next
        </Button>
      )}
    </div>
  );
}
