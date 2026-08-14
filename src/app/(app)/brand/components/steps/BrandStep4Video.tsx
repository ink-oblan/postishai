import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandFormData } from "../BrandSetupWizard";

interface BrandStep4VideoProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function BrandStep4Video({ formData, onUpdate }: BrandStep4VideoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Video Style & Meaning</h2>
        <p className="text-muted-foreground">Define your video aesthetics and brand meaning</p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="animations">Video Animations</Label>
          <Textarea
            id="animations"
            placeholder="e.g., Smooth fade-ins, Kinetic text animations, Minimal transitions"
            value={formData.videoAnimations || ""}
            onChange={(e) => onUpdate({ videoAnimations: e.target.value })}
            className="mt-2"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="transitions">Video Transitions</Label>
          <Textarea
            id="transitions"
            placeholder="e.g., Cross fade, Slide left, Zoom in, Cut"
            value={formData.videoTransitions || ""}
            onChange={(e) => onUpdate({ videoTransitions: e.target.value })}
            className="mt-2"
            rows={2}
          />
        </div>

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
