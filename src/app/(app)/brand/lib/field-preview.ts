import { parseList } from "./list-field";

/** Level 0 says what it means on its own — "None" reads as "nothing picked yet" out of context. */
export const EMOJI_LEVEL_LABELS = ["No emojis", "Moderate", "High", "Very High"] as const;

export const EMPTY_LABEL = "Empty";

/** One item of a list-shaped field: a colour, a font, an uploaded asset. */
export interface FieldEntry {
  /** Identity the saved list is diffed against the edited one by; not shown. */
  key: string;
  label: string;
  /** Hex fill for the swatch drawn beside the label. */
  swatch?: string;
  /** Secondary detail — image dimensions, where a font came from. */
  meta?: string;
}

/** Fields render either as prose or as a list of items, and diff accordingly. */
export type FieldPreview =
  | { kind: "text"; text: string }
  | { kind: "entries"; entries: FieldEntry[] };

function entries(value: unknown): Record<string, unknown>[] {
  return parseList<Record<string, unknown>>(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function colorEntries(value: unknown): FieldEntry[] {
  return entries(value).map((color) => {
    const hex = text(color.hex);
    return {
      key: (hex ?? text(color.name) ?? EMPTY_LABEL).toLowerCase(),
      label: text(color.name) ?? hex ?? EMPTY_LABEL,
      swatch: hex,
    };
  });
}

function fontEntries(value: unknown): FieldEntry[] {
  return entries(value).map((font) => {
    const name = text(font.name) ?? "Unnamed font";
    return {
      key: name.toLowerCase(),
      label: name,
      meta: font.source === "uploaded" ? "Uploaded" : "Library",
    };
  });
}

/**
 * Assets are identified by name — the same file re-uploaded gets a fresh id and asset id, so
 * either of those would report a change the user never made.
 */
function assetEntries(value: unknown): FieldEntry[] {
  return entries(value).map((file) => {
    const name = text(file.name) ?? "Unnamed file";
    return { key: name.toLowerCase(), label: name };
  });
}

/** Two identical colours must not collapse into one another when the lists are diffed. */
function withUniqueKeys(entries: FieldEntry[]): FieldEntry[] {
  const seen = new Map<string, number>();

  return entries.map((entry) => {
    const occurrence = seen.get(entry.key) ?? 0;
    seen.set(entry.key, occurrence + 1);
    return occurrence === 0 ? entry : { ...entry, key: `${entry.key}#${occurrence}` };
  });
}

function textValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY_LABEL;

  switch (field) {
    case "youFormality":
      return value ? "Casual" : "Formal";
    case "emojiLevel":
      return EMOJI_LEVEL_LABELS[Number(value)] ?? String(value);
    default:
      return String(value);
  }
}

/** Human-readable shape of a field value, for the "Changed" badge's diff. */
export function previewFieldValue(field: string, value: unknown): FieldPreview {
  switch (field) {
    case "colors":
      return { kind: "entries", entries: withUniqueKeys(colorEntries(value)) };
    case "typography":
      return { kind: "entries", entries: withUniqueKeys(fontEntries(value)) };
    case "logoPath":
    case "patterns":
      return { kind: "entries", entries: withUniqueKeys(assetEntries(value)) };
    default:
      return { kind: "text", text: textValue(field, value) };
  }
}

/** Flat rendering of a field value, for screen readers and any other single-line context. */
export function formatFieldValue(field: string, value: unknown): string {
  const preview = previewFieldValue(field, value);
  if (preview.kind === "text") return preview.text;

  const labels = preview.entries.map((entry) =>
    entry.meta ? `${entry.label} (${entry.meta})` : entry.label,
  );
  return labels.length > 0 ? labels.join(", ") : EMPTY_LABEL;
}

export type DiffStatus = "added" | "removed" | "same";

export type DiffedEntry = FieldEntry & { status: DiffStatus };

/**
 * One list holding both sides of the edit: the previous items in their old order, the ones it
 * dropped among them, and whatever it added tacked on the end.
 */
export function diffEntries(previous: FieldEntry[], current: FieldEntry[]): DiffedEntry[] {
  const previousKeys = new Set(previous.map((entry) => entry.key));
  const currentKeys = new Set(current.map((entry) => entry.key));

  return [
    ...previous.map((entry) => ({
      ...entry,
      status: currentKeys.has(entry.key) ? ("same" as const) : ("removed" as const),
    })),
    ...current
      .filter((entry) => !previousKeys.has(entry.key))
      .map((entry) => ({ ...entry, status: "added" as const })),
  ];
}

/** Words of context kept either side of the edit once the untouched run is elided. */
const CONTEXT_WORDS = 4;
const ELLIPSIS = "…";

/** Splits into words while keeping the whitespace, so the text can be rebuilt verbatim. */
function tokenize(value: string): string[] {
  return value.split(/(\s+)/).filter((token) => token.length > 0);
}

function countCommon(a: string[], b: string[], fromEnd: boolean): number {
  const limit = Math.min(a.length, b.length);
  let count = 0;

  while (count < limit) {
    const left = fromEnd ? a[a.length - 1 - count] : a[count];
    const right = fromEnd ? b[b.length - 1 - count] : b[count];
    if (left !== right) break;
    count++;
  }

  return count;
}

export interface TextSegment {
  text: string;
  status: DiffStatus;
}

/**
 * Keeps the few words of an untouched run that sit next to the edit; the rest becomes an
 * ellipsis, so editing one clause of a long mission statement doesn't reprint the statement.
 */
function elide(tokens: string[], side: "head" | "tail", context: number): string {
  if (tokens.length <= context) return tokens.join("").trim();

  return side === "head"
    ? `${ELLIPSIS}${tokens
        .slice(tokens.length - context)
        .join("")
        .trim()}`
    : `${tokens.slice(0, context).join("").trim()}${ELLIPSIS}`;
}

/**
 * The edit as a word-level diff: the untouched text either side of it, what it took out, and
 * what it put in. Segments are trimmed, so the renderer spaces them out itself.
 */
export function diffText(previous: string, current: string): TextSegment[] {
  const previousTokens = tokenize(previous);
  const currentTokens = tokenize(current);
  // Whitespace counts as a token, so a word of context is two of them.
  const context = CONTEXT_WORDS * 2;

  const head = countCommon(previousTokens, currentTokens, false);
  const maxTail = Math.min(previousTokens.length, currentTokens.length) - head;
  const tail = Math.min(countCommon(previousTokens, currentTokens, true), Math.max(maxTail, 0));

  const segments: TextSegment[] = [];
  const push = (text: string, status: DiffStatus) => {
    if (text.length > 0) segments.push({ text, status });
  };

  push(elide(previousTokens.slice(0, head), "head", context), "same");
  push(
    previousTokens
      .slice(head, previousTokens.length - tail)
      .join("")
      .trim(),
    "removed",
  );
  push(
    currentTokens
      .slice(head, currentTokens.length - tail)
      .join("")
      .trim(),
    "added",
  );
  push(elide(previousTokens.slice(previousTokens.length - tail), "tail", context), "same");

  return segments;
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}${ELLIPSIS}` : value;
}
