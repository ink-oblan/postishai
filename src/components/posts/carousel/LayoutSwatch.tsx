"use client";

import {
  isLayoutName,
  LAYOUT_LABELS,
  LAYOUT_NAMES,
  type LayoutName,
  layoutSketch,
} from "@/lib/design/layouts";

const SWATCH_WIDTH = 34;
const SWATCH_HEIGHT = 42;
const BAR_GAP = 3;

const JUSTIFY: Record<string, string> = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};

const ALIGN: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

interface LayoutSwatchProps {
  value: string;
  onChange: (layout: LayoutName) => void;
}

export function LayoutSwatch({ value, onChange }: LayoutSwatchProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LAYOUT_NAMES.map((name) => {
        const selected = isLayoutName(value) ? value === name : false;

        return (
          <button
            key={name}
            type="button"
            aria-pressed={selected}
            aria-label={LAYOUT_LABELS[name]}
            title={LAYOUT_LABELS[name]}
            onClick={() => onChange(name)}
            data-testid={`layout-swatch-${name}`}
            className={`rounded-md border-2 bg-muted p-1 transition-all ${
              selected ? "border-primary opacity-100" : "border-border opacity-60 hover:opacity-100"
            }`}
          >
            <Wireframe name={name} />
          </button>
        );
      })}
    </div>
  );
}

function Wireframe({ name }: { name: LayoutName }) {
  const { anchor, align, headingScale, bodyScale } = layoutSketch(name);
  const heading = Math.max(3, Math.round(SWATCH_WIDTH * headingScale * 1.6));
  const body = Math.max(1, Math.round(SWATCH_WIDTH * bodyScale * 1.6));

  return (
    <span
      className="flex flex-col"
      style={{
        width: SWATCH_WIDTH,
        height: SWATCH_HEIGHT,
        gap: BAR_GAP,
        justifyContent: JUSTIFY[anchor],
        alignItems: ALIGN[align],
      }}
    >
      <span
        className="block rounded-[1px] bg-foreground/70"
        style={{ width: "88%", height: heading }}
      />
      <span
        className="block rounded-[1px] bg-foreground/70"
        style={{ width: "62%", height: heading }}
      />
      <span
        className="block rounded-[1px] bg-foreground/35"
        style={{ width: "76%", height: body }}
      />
      <span
        className="block rounded-[1px] bg-foreground/35"
        style={{ width: "50%", height: body }}
      />
    </span>
  );
}
