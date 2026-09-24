"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { LayoutSwatch } from "@/components/posts/carousel/LayoutSwatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FitReport } from "@/lib/design/fit";
import type { LayoutName } from "@/lib/design/layouts";

export interface InspectorSlide {
  key: string;
  id: string | null;
  headline: string;
  body: string;
  visualPrompt: string;
  layout: string;
}

interface ScenarioInspectorProps {
  slide: InspectorSlide;
  position: number;
  total: number;
  fit: FitReport | null;
  regenerating: boolean;
  deletable: boolean;
  onChange: (changes: Partial<InspectorSlide>) => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export function ScenarioInspector({
  slide,
  position,
  total,
  fit,
  regenerating,
  deletable,
  onChange,
  onRegenerate,
  onDelete,
}: ScenarioInspectorProps) {
  const [showVisual, setShowVisual] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase">
          Slide {position} of {total}
        </span>
        <div className="flex gap-1">
          {slide.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Rewrite this slide"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Delete slide"
            onClick={onDelete}
            disabled={!deletable}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scenario-headline">Headline</Label>
        <Input
          id="scenario-headline"
          value={slide.headline}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ headline: e.target.value })
          }
        />
        {!slide.headline.trim() && (
          <p className="text-destructive text-xs">A slide needs a headline.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="scenario-body">Body</Label>
        <Textarea
          id="scenario-body"
          value={slide.body}
          rows={3}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ body: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Layout</Label>
        <LayoutSwatch
          value={slide.layout}
          onChange={(layout: LayoutName) => onChange({ layout })}
        />
      </div>

      {fit?.overflowing && (
        <p className="flex items-start gap-1.5 text-destructive text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The copy runs past the safe area even at its smallest. Shorten it or pick a roomier
          layout.
        </p>
      )}
      {!fit?.overflowing && fit?.shrunk && (
        <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The text was shrunk to fit. Shortening it keeps the layout's intended size.
        </p>
      )}

      <div className="space-y-2 border-t pt-4">
        <button
          type="button"
          onClick={() => setShowVisual((open) => !open)}
          className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        >
          {showVisual ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Background prompt
        </button>
        {showVisual && (
          <>
            <Textarea
              id="scenario-visual"
              value={slide.visualPrompt}
              rows={3}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ visualPrompt: e.target.value })
              }
            />
            <p className="text-muted-foreground text-xs">
              What the image model is asked to paint behind the copy.
            </p>
            {!slide.visualPrompt.trim() && (
              <p className="text-destructive text-xs">A slide needs a background prompt.</p>
            )}
          </>
        )}
        {!showVisual && !slide.visualPrompt.trim() && (
          <p className="text-destructive text-xs">This slide has no background prompt.</p>
        )}
      </div>
    </div>
  );
}
