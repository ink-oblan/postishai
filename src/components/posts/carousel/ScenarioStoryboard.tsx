"use client";

import { Reorder } from "framer-motion";
import { AlertTriangle, GripVertical } from "lucide-react";
import { DesignPreview } from "@/components/design/DesignPreview";
import { resolveFontFamily } from "@/components/design/font-catalogue";
import { Badge } from "@/components/ui/badge";
import type { CanvasSpec } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import type { FitReport } from "@/lib/design/fit";

export interface StoryboardSlide {
  key: string;
  document: DesignDocument;
  role: "hook" | "cta" | null;
  fit: FitReport | null;
  incomplete: boolean;
}

interface ScenarioStoryboardProps {
  slides: StoryboardSlide[];
  selectedKey: string | null;
  spec: CanvasSpec;
  onSelect: (key: string) => void;
  onReorder: (slides: StoryboardSlide[]) => void;
}

const CARD_WIDTH = 148;

const ROLE_LABELS = { hook: "Hook", cta: "CTA" } as const;

export function ScenarioStoryboard({
  slides,
  selectedKey,
  spec,
  onSelect,
  onReorder,
}: ScenarioStoryboardProps) {
  return (
    <Reorder.Group
      as="ul"
      axis="x"
      values={slides}
      onReorder={onReorder}
      className="flex list-none gap-3 overflow-x-auto pb-2"
    >
      {slides.map((slide, index) => (
        <Reorder.Item
          key={slide.key}
          value={slide}
          as="li"
          className="shrink-0 cursor-grab active:cursor-grabbing"
          style={{ width: CARD_WIDTH }}
        >
          <button
            type="button"
            onClick={() => onSelect(slide.key)}
            data-testid="scenario-slide"
            aria-current={selectedKey === slide.key}
            className={`block w-full overflow-hidden rounded-lg border-2 text-left transition-all ${
              selectedKey === slide.key
                ? "border-primary opacity-100"
                : "border-border opacity-70 hover:opacity-100"
            }`}
          >
            <div className="relative">
              <DesignPreview
                document={slide.document}
                spec={spec}
                width={CARD_WIDTH - 4}
                showPlaceholder
                resolveFontFamily={resolveFontFamily}
              />
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 font-medium text-[10px] text-white">
                {index + 1}
              </span>
              {slide.role && (
                <Badge
                  variant="secondary"
                  className="absolute top-1 right-1 h-4 px-1.5 text-[10px]"
                >
                  {ROLE_LABELS[slide.role]}
                </Badge>
              )}
              <GripVertical className="absolute right-1 bottom-1 h-3.5 w-3.5 text-white/50" />
            </div>
          </button>

          <div className="mt-1 flex min-h-4 flex-wrap items-center gap-1">
            {slide.incomplete && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                Incomplete
              </Badge>
            )}
            {slide.fit?.overflowing && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                <AlertTriangle />
                Overflows
              </Badge>
            )}
            {!slide.fit?.overflowing && slide.fit?.shrunk && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                <AlertTriangle />
                Shrunk
              </Badge>
            )}
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
