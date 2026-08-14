interface WizardProgressProps {
  currentStep: number;
  steps: string[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="space-y-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="font-medium text-foreground">{steps[currentStep]}</span>
      </div>
    </div>
  );
}
