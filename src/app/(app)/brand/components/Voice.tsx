"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import type { BrandFormData } from "./BrandSetupWizard";
import { ValidatedTextarea } from "./ValidatedTextarea";

const EMOJI_LEVEL_LABELS = ["None", "Moderate", "High", "Very High"] as const;

interface VoiceProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
}

export function Voice({ formData, onUpdate }: VoiceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Tone of Voice</h2>
        <p className="text-muted-foreground">How does your brand speak to its audience?</p>
      </div>

      <div className="space-y-5">
        <div style={{ marginTop: "1.5rem" }}>
          <Label htmlFor="formality" style={{ marginBottom: "0.5rem", display: "block" }}>
            Formality Level <span className="text-destructive">*</span>
          </Label>
          <Combobox
            value={formData.youFormality ? "casual" : "formal"}
            onValueChange={(value) => onUpdate({ youFormality: value === "casual" })}
          >
            <ComboboxInputGroup>
              <ComboboxInput
                id="formality"
                placeholder="Select formality level..."
                readOnly
                value={formData.youFormality ? "Casual" : "Formal"}
              />
            </ComboboxInputGroup>
            <ComboboxContent>
              <ComboboxItem value="formal">Formal — Professional, respectful</ComboboxItem>
              <ComboboxItem value="casual">Casual — Friendly, intimate</ComboboxItem>
            </ComboboxContent>
          </Combobox>
        </div>

        <div>
          <Label htmlFor="emojiLevel">
            Emoji & Hashtag Level <span className="text-destructive">*</span>
          </Label>
          <div className="mt-3 mb-4" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <div className="flex gap-2">
              {EMOJI_LEVEL_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onUpdate({ emojiLevel: idx })}
                  className={`rounded border px-2 py-1.5 font-medium text-xs transition-all ${
                    (formData.emojiLevel || 0) === idx
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {(() => {
              const examples = [
                "Check out our new product.\n\nIt delivers amazing results and transforms your workflow. Simple, powerful, and built for you.",
                "Check out our new product 😊\n\nIt delivers amazing results and transforms your workflow 💡 Simple, powerful, and built for you.\n\n#innovation #business",
                "🎉 Check out our new product 🎉\n\nIt delivers amazing results ✨ and transforms your workflow 💪\n\nSimple, powerful, and built for you 🚀\n\n#innovation #business #newlaunch #excited",
                "🚀 CHECK THIS OUT 🚀\n\nOur new product is AMAZING 💯✨\n→ Delivers incredible results 🔥\n→ Transforms your workflow 💪\n→ Built just for you 💖\n\n#innovation #business #newlaunch #mustfollow #incredible #gamechanger",
              ];
              return (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--muted)",
                    color: "var(--foreground)",
                    padding: "1rem",
                    fontFamily: "sans-serif",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                    marginTop: "1rem",
                  }}
                >
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
