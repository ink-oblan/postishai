import { Label } from "@/components/ui/label";
import type { BrandFormData } from "../BrandSetupWizard";
import { ValidatedTextarea } from "../ValidatedTextarea";

interface BrandStep3VoiceProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function BrandStep3Voice({ formData, onUpdate }: BrandStep3VoiceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Tone of Voice</h2>
        <p className="text-muted-foreground">How does your brand speak to its audience?</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="formality">
            Formality Level <span className="text-destructive">*</span>
          </Label>
          <select
            id="formality"
            value={formData.youFormality ? "casual" : "formal"}
            onChange={(e) => onUpdate({ youFormality: e.target.value === "casual" })}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
          >
            <option value="formal">Formal — Professional, respectful</option>
            <option value="casual">Casual — Friendly, intimate</option>
          </select>
        </div>

        <div>
          <Label htmlFor="emojiLevel">
            Emoji & Hashtag Level <span className="text-destructive">*</span>
          </Label>
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="emojiLevel"
                type="range"
                min={0}
                max={3}
                value={formData.emojiLevel || 0}
                onChange={(e) => onUpdate({ emojiLevel: parseInt(e.target.value, 10) })}
                className="flex-1"
              />
              <span className="min-w-12 font-medium text-muted-foreground text-xs">
                {formData.emojiLevel === 0
                  ? "None"
                  : formData.emojiLevel === 1
                    ? "Moderate"
                    : formData.emojiLevel === 2
                      ? "High"
                      : "Very High"}
              </span>
            </div>
            {(() => {
              const examples = [
                "Check out our new product.\n\nIt delivers amazing results and transforms your workflow. Simple, powerful, and built for you.",
                "Check out our new product 😊\n\nIt delivers amazing results and transforms your workflow 💡 Simple, powerful, and built for you.\n\n#innovation #business",
                "🎉 Check out our new product 🎉\n\nIt delivers amazing results ✨ and transforms your workflow 💪\n\nSimple, powerful, and built for you 🚀\n\n#innovation #business #newlaunch #excited",
                "🚀 CHECK THIS OUT 🚀\n\nOur new product is AMAZING 💯✨\n→ Delivers incredible results 🔥\n→ Transforms your workflow 💪\n→ Built just for you 💖\n\n#innovation #business #newlaunch #mustfollow #incredible #gamechanger",
              ];
              return (
                <div className="whitespace-pre-wrap rounded border border-border/50 bg-muted/30 p-4 font-sans text-sm leading-relaxed">
                  {examples[formData.emojiLevel || 0]}
                </div>
              );
            })()}
          </div>
        </div>

        <ValidatedTextarea
          id="voiceStyle"
          label="Brand Voice Style"
          value={formData.voiceStyle || ""}
          onChange={(value) => onUpdate({ voiceStyle: value })}
          placeholder="e.g., Professional yet approachable, Playful and witty, Educational and authoritative"
          fieldName="voiceStyle"
          rows={2}
        />

        <ValidatedTextarea
          id="vocabulary"
          label="Brand Vocabulary & Phrases"
          value={formData.brandVocabulary || ""}
          onChange={(value) => onUpdate({ brandVocabulary: value })}
          placeholder="Key words, catchphrases, or signature expressions your brand uses"
          fieldName="brandVocabulary"
          rows={3}
        />
      </div>
    </div>
  );
}
