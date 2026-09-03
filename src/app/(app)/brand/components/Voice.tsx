"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import type { BrandFormData } from "@/lib/brand-fields";
import { EMOJI_LEVEL_LABELS } from "@/lib/brand-fields";
import type { FieldChanges } from "../lib/draft";
import type { StepValidation } from "../lib/validation";
import { FieldStatusIcon, fieldStatus, TONE_BLOCK_CLASS } from "./FieldStatus";
import { ValidatedTextarea } from "./ValidatedTextarea";

interface VoiceProps {
  formData: BrandFormData;
  onUpdate: (updates: Partial<BrandFormData>) => void;
  changes?: FieldChanges;
  validation?: StepValidation;
}

/** The same caption written at each level, so the scale is judged by eye rather than by name. */
const EMOJI_LEVEL_EXAMPLES: Record<number, string> = {
  0: "Check out our new product.\n\nIt delivers amazing results and transforms your workflow. Simple, powerful, and built for you.",
  1: "Check out our new product 😊\n\nIt delivers amazing results and transforms your workflow 💡 Simple, powerful, and built for you.\n\n#innovation #business",
  2: "🎉 Check out our new product 🎉\n\nIt delivers amazing results ✨ and transforms your workflow 💪\n\nSimple, powerful, and built for you 🚀\n\n#innovation #business #newlaunch #excited",
  3: "🚀 CHECK THIS OUT 🚀\n\nOur new product is AMAZING 💯✨\n→ Delivers incredible results 🔥\n→ Transforms your workflow 💪\n→ Built just for you 💖\n\n#innovation #business #newlaunch #mustfollow #incredible #gamechanger",
};

const FORMALITY_LABELS = { formal: "Formal", casual: "Casual" } as const;

export function Voice({ formData, onUpdate, changes, validation }: VoiceProps) {
  const formality = fieldStatus("youFormality", {
    value: formData.youFormality,
    changes,
    validation,
  });

  const emoji = fieldStatus("emojiLevel", { value: formData.emojiLevel, changes, validation });

  // `null` means the user hasn't answered yet, which neither side of the choice can express —
  // so the control shows its placeholder and the preview waits for a level to preview.
  const formalityValue =
    formData.youFormality === null ? null : formData.youFormality ? "casual" : "formal";
  const emojiExample =
    formData.emojiLevel === null ? null : EMOJI_LEVEL_EXAMPLES[formData.emojiLevel];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-bold text-2xl">Tone of Voice</h2>
        <p className="text-muted-foreground">How does your brand speak to its audience?</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2" data-brand-field="youFormality">
          <Label htmlFor="formality">
            Formality Level <span className="text-destructive">*</span>
          </Label>
          <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[formality.tone]}`}>
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Choose between formal and casual communication style
              </p>
              <FieldStatusIcon
                tone={formality.tone}
                field="youFormality"
                changes={changes}
                className="ml-2"
              />
            </div>
            <Combobox
              value={formalityValue}
              onValueChange={(value) => onUpdate({ youFormality: value === "casual" })}
            >
              <ComboboxInputGroup>
                <ComboboxInput
                  id="formality"
                  placeholder="Select formality level..."
                  readOnly
                  value={formalityValue ? FORMALITY_LABELS[formalityValue] : ""}
                />
              </ComboboxInputGroup>
              <ComboboxContent>
                <ComboboxItem value="formal">Formal — Professional, respectful</ComboboxItem>
                <ComboboxItem value="casual">Casual — Friendly, intimate</ComboboxItem>
              </ComboboxContent>
            </Combobox>
            {formality.message && <p className="mt-2 text-red-500 text-xs">{formality.message}</p>}
          </div>
        </div>

        <div className="space-y-2" data-brand-field="emojiLevel">
          <Label id="emojiLevel-label">
            Emoji & Hashtag Level <span className="text-destructive">*</span>
          </Label>
          <div className={`rounded-lg border p-4 ${TONE_BLOCK_CLASS[emoji.tone]}`}>
            <div className="mb-4 flex items-start justify-between">
              <p className="flex-1 text-muted-foreground text-xs">
                Select how many emojis and hashtags to use
              </p>
              <FieldStatusIcon
                tone={emoji.tone}
                field="emojiLevel"
                changes={changes}
                className="ml-2"
              />
            </div>
            <fieldset className="mb-4 flex gap-2" aria-labelledby="emojiLevel-label">
              {EMOJI_LEVEL_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={formData.emojiLevel === idx}
                  onClick={() => onUpdate({ emojiLevel: idx })}
                  className={`rounded border px-2 py-1.5 font-medium text-xs transition-all ${
                    formData.emojiLevel === idx
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </fieldset>
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed">
              {emojiExample ?? (
                <span className="text-muted-foreground italic">
                  Pick a level to see how a caption reads at it
                </span>
              )}
            </div>
            {emoji.message && <p className="mt-2 text-red-500 text-xs">{emoji.message}</p>}
          </div>
        </div>

        <ValidatedTextarea
          id="voiceStyle"
          label="Brand Voice Style"
          value={formData.voiceStyle || ""}
          onChange={(value) => onUpdate({ voiceStyle: value })}
          placeholder="e.g., Professional yet approachable, Playful and witty, Educational and authoritative"
          fieldName="voiceStyle"
          changes={changes}
          validation={validation}
          rows={2}
        />

        <ValidatedTextarea
          id="vocabulary"
          label="Brand Vocabulary & Phrases"
          value={formData.brandVocabulary || ""}
          onChange={(value) => onUpdate({ brandVocabulary: value })}
          placeholder="Key words, catchphrases, or signature expressions your brand uses"
          fieldName="brandVocabulary"
          changes={changes}
          validation={validation}
          rows={3}
        />
      </div>
    </div>
  );
}
