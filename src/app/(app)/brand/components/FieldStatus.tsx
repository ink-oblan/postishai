"use client";

import { AlertCircle, CheckCircle2, type LucideIcon, SquarePen } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FieldChange, FieldChanges } from "../lib/draft";
import {
  type DiffedEntry,
  type DiffStatus,
  diffEntries,
  diffText,
  EMPTY_LABEL,
  formatFieldValue,
  previewFieldValue,
  type TextSegment,
  truncate,
} from "../lib/field-preview";

export type FieldTone = "invalid" | "changed" | "valid" | "neutral";

const MAX_PREVIEW_CHARS = 200;
/** Beyond this the chips wrap into a wall; the count carries the rest. */
const MAX_PREVIEW_ENTRIES = 8;

/**
 * An unsaved edit re-tints the status indicator the field already has rather than adding a
 * second marker. Invalid still wins over changed — that is what blocks saving.
 */
export function fieldTone({
  invalid = false,
  changed,
  filled,
}: {
  invalid?: boolean;
  changed: boolean;
  filled: boolean;
}): FieldTone {
  if (invalid) return "invalid";
  if (changed) return "changed";
  return filled ? "valid" : "neutral";
}

/** Border/ring classes for a bare input or textarea. */
export const TONE_INPUT_CLASS: Record<FieldTone, string> = {
  invalid: "border-red-500 focus:ring-red-500",
  changed: "border-golden-earth-500 focus:ring-golden-earth-500",
  valid: "border-green-500 focus:ring-green-500",
  neutral: "border-border focus:ring-ring",
};

/** Border/background classes for the bordered blocks wrapping pickers and uploaders. */
export const TONE_BLOCK_CLASS: Record<FieldTone, string> = {
  invalid: "border-red-500 bg-red-500/5",
  changed: "border-golden-earth-500 bg-golden-earth-500/5",
  valid: "border-green-500 bg-green-500/5",
  neutral: "border-border bg-muted/20",
};

/** `neutral` shows nothing at all, so it has no icon. */
const TONE_ICON = {
  invalid: AlertCircle,
  changed: SquarePen,
  valid: CheckCircle2,
} as const satisfies Record<Exclude<FieldTone, "neutral">, LucideIcon>;

const TONE_ICON_CLASS: Record<FieldTone, string> = {
  invalid: "text-red-500",
  changed: "text-golden-earth-500",
  valid: "text-green-500",
  neutral: "",
};

const ENTRY_STATUS_CLASS: Record<DiffStatus, string> = {
  added: "border-green-500/50 bg-green-500/10",
  removed: "border-red-500/50 bg-red-500/10",
  same: "border-border/60 bg-muted/40 text-muted-foreground",
};

const TEXT_STATUS_CLASS: Record<DiffStatus, string> = {
  added: "rounded-sm bg-green-500/10 px-0.5 text-green-500",
  removed: "rounded-sm bg-red-500/10 px-0.5 text-red-500 line-through",
  same: "text-muted-foreground",
};

function EntryChip({ entry }: { entry: DiffedEntry }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.7rem]",
        ENTRY_STATUS_CLASS[entry.status],
      )}
    >
      {entry.swatch && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
          style={{ backgroundColor: entry.swatch }}
        />
      )}
      <span className={cn("truncate", entry.status === "removed" && "line-through")}>
        {entry.label}
      </span>
      {entry.meta && <span className="shrink-0 opacity-60">{entry.meta}</span>}
    </span>
  );
}

function EntryList({ entries }: { entries: DiffedEntry[] }) {
  if (entries.length === 0) {
    return <span className="text-muted-foreground italic">{EMPTY_LABEL}</span>;
  }

  const shown = entries.slice(0, MAX_PREVIEW_ENTRIES);
  const hidden = entries.length - shown.length;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((entry) => (
        <EntryChip key={entry.key} entry={entry} />
      ))}
      {hidden > 0 && <span className="text-[0.7rem] text-muted-foreground">+{hidden} more</span>}
    </span>
  );
}

/** Red struck-through is what the edit took out, green what it put in. */
function DiffBlock({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div className={cn("border-golden-earth-500/50 border-l-2 pl-2", width)}>
      <span className="block text-[0.62rem] text-muted-foreground uppercase tracking-wide">
        Changes
      </span>
      <span className="mt-0.5 block break-words">{children}</span>
    </div>
  );
}

function TextDiff({ segments }: { segments: TextSegment[] }) {
  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment, index) => (
        <span key={`${segment.status}-${segment.text}`}>
          {index > 0 && " "}
          <span className={TEXT_STATUS_CLASS[segment.status]}>
            {truncate(segment.text, MAX_PREVIEW_CHARS)}
          </span>
        </span>
      ))}
    </span>
  );
}

function ChangeSummary({ field, change }: { field: string; change: FieldChange }) {
  const previous = previewFieldValue(field, change.original);
  const current = previewFieldValue(field, change.current);

  if (previous.kind === "entries" && current.kind === "entries") {
    return (
      <DiffBlock width="w-64">
        <EntryList entries={diffEntries(previous.entries, current.entries)} />
      </DiffBlock>
    );
  }

  const previousText =
    previous.kind === "text" ? previous.text : formatFieldValue(field, change.original);
  const currentText =
    current.kind === "text" ? current.text : formatFieldValue(field, change.current);

  return (
    <DiffBlock width="w-60">
      <TextDiff segments={diffText(previousText, currentText)} />
    </DiffBlock>
  );
}

interface FieldStatusIconProps {
  tone: FieldTone;
  field: string;
  changes?: FieldChanges;
  className?: string;
}

export function FieldStatusIcon({ tone, field, changes, className }: FieldStatusIconProps) {
  if (tone === "neutral") return null;

  const Icon = TONE_ICON[tone];
  const icon = <Icon className={cn("h-5 w-5", TONE_ICON_CLASS[tone])} aria-hidden="true" />;
  const change = changes?.[field];

  if (tone !== "changed" || !change) {
    return <span className={cn("inline-flex shrink-0", className)}>{icon}</span>;
  }

  const label = `Edited. Before: ${truncate(formatFieldValue(field, change.original), MAX_PREVIEW_CHARS)}. Now: ${truncate(formatFieldValue(field, change.current), MAX_PREVIEW_CHARS)}.`;

  return (
    <Tooltip
      delay={0}
      // Sits directly over the field it belongs to, within a glance of the current value.
      side="top"
      className="max-w-none p-2.5 duration-100"
      content={<ChangeSummary field={field} change={change} />}
    >
      <button
        type="button"
        aria-label={label}
        className={cn("inline-flex shrink-0 cursor-default", className)}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
