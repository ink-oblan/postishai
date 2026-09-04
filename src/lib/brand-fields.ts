/**
 * The one declaration of what a brand profile is made of.
 *
 * Deliberately dependency-free: both the client components and the route handler import it.
 */

export const MAX_TEXT_LENGTH = 2_000;
const MAX_JSON_LENGTH = 100_000;

/** Level 0 says what it means on its own — "None" reads as "nothing picked yet" out of context. */
export const EMOJI_LEVEL_LABELS = ["No emojis", "Moderate", "High", "Very High"] as const;

export interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

export interface FontItem {
  id: string;
  name: string;
  source: "builtin" | "uploaded";
  /** BrandAsset id of the uploaded font file; unset for library fonts. */
  assetId?: string;
}

export interface BrandAssetRef {
  id: string;
  name: string;
  /** BrandAsset row id, present once the file has been uploaded. */
  assetId?: string;
}

/**
 * The form the wizard edits. Every key needs a spec below — the mapped type on `BRAND_FIELDS`
 * turns a field added here without one into a compile error rather than a runtime surprise.
 */
export interface BrandFormData {
  brandName: string;
  topic: string;
  targetAudience: string;
  mission: string;
  colors: ColorItem[];
  typography: FontItem[];
  logoPath: BrandAssetRef[];
  patterns: BrandAssetRef[];
  photoStyle: string;
  /** `null` until the user picks — neither side of the choice can stand in for "not asked yet". */
  youFormality: boolean | null;
  emojiLevel: number | null;
  voiceStyle: string;
  brandVocabulary: string;
  videoAnimations: string;
  videoTransitions: string;
}

export type BrandFieldName = keyof BrandFormData;

/** What a field holds, which is also how it is validated, previewed and rendered. */
export type BrandFieldKind = "text" | "flag" | "level" | "colors" | "fonts" | "assets";

const LIST_KINDS: readonly BrandFieldKind[] = ["colors", "fonts", "assets"];

/**
 * A value the form can use, plus how much of it had to be shed to get there. Callers pick their
 * own tolerance: seeding from the database takes whatever it can get, while restoring a draft
 * or storing a write insists on `dropped === 0` — a half-restored list is an edit the user
 * never made, and saving it would quietly throw away the entries it could not read.
 */
export interface ParsedField<T> {
  value: T;
  dropped: number;
}

export interface BrandFieldSpec<T> {
  kind: BrandFieldKind;
  /** Wizard step the field is edited on. */
  step: number;
  label: string;
  /** A fresh default — a factory, so no two seeds share one array. */
  seed: () => T;
  /** The API refuses to store the brand at all without it. */
  required?: boolean;
  /**
   * Bounds the wizard enforces and shows a counter for: characters for text fields, entries
   * for list fields. A field without bounds is free-form, held only by the blanket caps that
   * `parse` applies.
   */
  limits?: { min: number; max: number };
  /**
   * The structural contract: what this form can render and what the API will store. Returns
   * nothing when the value isn't this field's shape at all.
   */
  parse: (value: unknown) => ParsedField<T> | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty string, or nothing — the shape most entry keys are optional in. */
function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * List fields arrive already parsed — from a Json column, or from a client sending real JSON —
 * or as the JSON string older clients and rows still carry. Anything else holds no list.
 */
function asList(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value === "") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Tolerant read for the places that only render a list: anything unreadable is simply empty. */
export function parseList<T>(value: unknown): T[] {
  return (asList(value) as T[] | undefined) ?? [];
}

function parseEntries<T>(
  value: unknown,
  parseEntry: (raw: Record<string, unknown>) => T | undefined,
): ParsedField<T[]> | undefined {
  const list = asList(value);
  if (!list) return undefined;

  let dropped = 0;
  const entries = list.flatMap((raw) => {
    const entry = isRecord(raw) ? parseEntry(raw) : undefined;
    if (entry === undefined) {
      dropped++;
      return [];
    }
    return [entry];
  });

  // Measured after parsing, so an oversized field is judged on what would actually be stored.
  if (JSON.stringify(entries).length > MAX_JSON_LENGTH) return undefined;

  return { value: entries, dropped };
}

/**
 * `#rgb` through `#rrggbbaa`, which is every form the pickers emit — and only those, since the
 * in-between lengths a range would let through are neither a colour CSS can read nor one the
 * advanced picker's sliders can represent.
 */
const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isValidHexColor(hex: string): boolean {
  return HEX_PATTERN.test(hex);
}

function parseColor(raw: Record<string, unknown>): ColorItem | undefined {
  const hex = str(raw.hex);
  // A colour is its hex — without one there is nothing for the picker to draw or edit.
  if (!hex || !isValidHexColor(hex)) return undefined;

  return { id: str(raw.id) ?? "", name: str(raw.name) ?? "", hex };
}

function parseFont(raw: Record<string, unknown>): FontItem | undefined {
  const name = str(raw.name);
  if (!name) return undefined;

  const assetId = str(raw.assetId);
  // Fonts stored before `source` existed — and any value the picker doesn't know — read as
  // library fonts, the same fallback the preview badge makes.
  const source = raw.source === "uploaded" ? "uploaded" : "builtin";

  return { id: str(raw.id) ?? "", name, source, ...(assetId ? { assetId } : {}) };
}

function parseAssetRef(raw: Record<string, unknown>): BrandAssetRef | undefined {
  const name = str(raw.name);
  if (!name) return undefined;

  const assetId = str(raw.assetId);
  return { id: str(raw.id) ?? "", name, ...(assetId ? { assetId } : {}) };
}

function parseText(value: unknown): ParsedField<string> | undefined {
  if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH) return undefined;
  return { value, dropped: 0 };
}

function parseFlag(value: unknown): ParsedField<boolean> | undefined {
  return typeof value === "boolean" ? { value, dropped: 0 } : undefined;
}

function parseLevel(value: unknown): ParsedField<number> | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 0 || value >= EMOJI_LEVEL_LABELS.length) return undefined;
  return { value, dropped: 0 };
}

const text = { kind: "text", seed: () => "", parse: parseText } as const;

export const BRAND_FIELDS: { [K in BrandFieldName]: BrandFieldSpec<BrandFormData[K]> } = {
  brandName: { ...text, step: 0, label: "Brand Name", required: true, limits: { min: 3, max: 50 } },
  topic: { ...text, step: 0, label: "Topic / Niche", required: true, limits: { min: 3, max: 100 } },
  targetAudience: {
    ...text,
    step: 0,
    label: "Target Audience",
    required: true,
    limits: { min: 20, max: 500 },
  },
  mission: { ...text, step: 0, label: "Mission & Values", limits: { min: 0, max: 500 } },

  colors: {
    kind: "colors",
    step: 1,
    label: "Color Palette",
    limits: { min: 2, max: 5 },
    seed: () => [],
    parse: (value) => parseEntries(value, parseColor),
  },
  typography: {
    kind: "fonts",
    step: 1,
    label: "Typography",
    limits: { min: 1, max: 3 },
    seed: () => [],
    parse: (value) => parseEntries(value, parseFont),
  },
  logoPath: {
    kind: "assets",
    step: 1,
    label: "Logo",
    seed: () => [],
    parse: (value) => parseEntries(value, parseAssetRef),
  },
  patterns: {
    kind: "assets",
    step: 1,
    label: "Patterns & Decorative Elements",
    seed: () => [],
    parse: (value) => parseEntries(value, parseAssetRef),
  },
  photoStyle: { ...text, step: 1, label: "Photo Style", limits: { min: 0, max: 300 } },

  // Both open unset rather than on a default: a brand's tone is worth a deliberate choice, and
  // seeding one would let the user skip past the question without ever seeing it.
  youFormality: {
    kind: "flag",
    step: 2,
    label: "Formality Level",
    required: true,
    seed: () => null,
    parse: parseFlag,
  },
  emojiLevel: {
    kind: "level",
    step: 2,
    label: "Emoji & Hashtag Level",
    required: true,
    seed: () => null,
    parse: parseLevel,
  },
  voiceStyle: { ...text, step: 2, label: "Brand Voice Style", limits: { min: 0, max: 300 } },
  brandVocabulary: { ...text, step: 2, label: "Brand Vocabulary", limits: { min: 0, max: 300 } },

  videoAnimations: { ...text, step: 3, label: "Video Animations", limits: { min: 0, max: 300 } },
  videoTransitions: { ...text, step: 3, label: "Video Transitions", limits: { min: 0, max: 300 } },
};

export const BRAND_FIELD_NAMES = Object.keys(BRAND_FIELDS) as BrandFieldName[];

export function isBrandField(name: string): name is BrandFieldName {
  return Object.hasOwn(BRAND_FIELDS, name);
}

export function isListField(field: BrandFieldName): boolean {
  return LIST_KINDS.includes(BRAND_FIELDS[field].kind);
}

/** Free-form fields still get a counter if one is asked for; the API's cap is the only bound. */
export function fieldLimits(field: BrandFieldName): { min: number; max: number } {
  return BRAND_FIELDS[field].limits ?? { min: 0, max: MAX_TEXT_LENGTH };
}

export function brandFieldsForStep(step: number): BrandFieldName[] {
  return BRAND_FIELD_NAMES.filter((field) => BRAND_FIELDS[field].step === step);
}

export function fieldStep(field: BrandFieldName): number {
  return BRAND_FIELDS[field].step;
}

/** Fields whose entries can carry an uploaded asset. */
export const ASSET_FIELDS = BRAND_FIELD_NAMES.filter(
  (field) => BRAND_FIELDS[field].kind === "fonts" || BRAND_FIELDS[field].kind === "assets",
);

/** What the API answers with when a field arrives in a shape this form can't take. */
export function invalidFieldMessage(field: BrandFieldName): string {
  switch (BRAND_FIELDS[field].kind) {
    case "flag":
      return `${field} must be a boolean`;
    case "level":
      return `${field} must be an integer between 0 and ${EMOJI_LEVEL_LABELS.length - 1}`;
    case "text":
      return `${field} must be a string of at most ${MAX_TEXT_LENGTH} characters`;
    default:
      return `${field} must be a list of valid entries under ${MAX_JSON_LENGTH} characters`;
  }
}

/**
 * Whether the value is merely unfinished or actually wrong. The wizard surfaces the two at
 * different moments: being unfinished is the normal state of a form halfway through being
 * filled in, so it waits until the user tries to move on, while a value that is wrong however
 * long they keep typing is worth saying at once.
 */
export type FieldErrorKind = "incomplete" | "invalid";

export interface BrandFieldError {
  field: BrandFieldName;
  kind: FieldErrorKind;
  message: string;
  current: number;
  required: number;
}

/** What a field's bounds are counted in: characters for text fields, entries for list fields. */
function measure(field: BrandFieldName, value: unknown): number {
  if (isListField(field)) return parseList(value).length;
  return typeof value === "string" ? value.length : 0;
}

function shortfall(field: BrandFieldName, min: number): string {
  const { label } = BRAND_FIELDS[field];
  return isListField(field)
    ? `${label} needs at least ${min} ${min === 1 ? "entry" : "entries"}`
    : `${label} must be at least ${min} characters`;
}

function excess(field: BrandFieldName, max: number): string {
  const { label } = BRAND_FIELDS[field];
  return isListField(field)
    ? `${label} takes at most ${max} ${max === 1 ? "entry" : "entries"}`
    : `${label} cannot exceed ${max} characters`;
}

/**
 * A field is checked only against the bounds it declares, and a `min` of 0 makes an empty
 * value fine — that is what optional means here. Fields with no bounds at all are free-form
 * and pass unconditionally.
 *
 * Shared by the wizard, which uses it to gate step navigation, and the API route, which is the
 * authoritative check — the wizard's is UX only and a raw request can bypass it.
 */
function validateFieldLimits(field: BrandFieldName, value: unknown): BrandFieldError | null {
  const limits = BRAND_FIELDS[field].limits;
  if (!limits) return null;

  const current = measure(field, value);

  if (current < limits.min) {
    const message = shortfall(field, limits.min);
    return { field, kind: "incomplete", message, current, required: limits.min };
  }

  if (current > limits.max) {
    const message = excess(field, limits.max);
    return { field, kind: "invalid", message, current, required: limits.max };
  }

  return null;
}

/**
 * Whether the field holds a value at all. Each kind spells "unset" differently, and for the two
 * choice fields it is neither falsy nor empty — `false` and `0` are answers, `null` is not.
 */
export function isFieldSet(field: BrandFieldName, value: unknown): boolean {
  switch (BRAND_FIELDS[field].kind) {
    case "flag":
    case "level":
      return value !== null && value !== undefined;
    case "text":
      return typeof value === "string" && value.trim().length > 0;
    default:
      return parseList(value).length > 0;
  }
}

/**
 * Everything the registry knows about a single value: that it is there at all, and that it sits
 * within its bounds. Required comes first so an untouched field is reported as unanswered rather
 * than as one character short of a minimum it never had a chance to meet.
 */
export function validateField(field: BrandFieldName, value: unknown): BrandFieldError | null {
  const spec = BRAND_FIELDS[field];

  if (spec.required && !isFieldSet(field, value)) {
    const required = spec.limits?.min ?? 1;
    const message = `${spec.label} is required`;
    return { field, kind: "incomplete", message, current: 0, required };
  }

  return validateFieldLimits(field, value);
}

/**
 * The value only if the whole of it survived parsing. Used where a partial read would be worse
 * than none: restoring a draft, and storing a write.
 */
export function parseWholeField(field: BrandFieldName, value: unknown): unknown | undefined {
  const parsed = BRAND_FIELDS[field].parse(value);
  return parsed && parsed.dropped === 0 ? parsed.value : undefined;
}

/**
 * What the wizard opens with: the saved brand where it can be read, the field's own default
 * everywhere else. Tolerant by design — a row holding one unreadable entry should still show
 * the user the rest of their brand rather than an empty form.
 */
export function seedFormData(
  saved: Partial<Record<BrandFieldName, unknown>> | null,
): BrandFormData {
  const seeded = {} as Record<BrandFieldName, unknown>;

  for (const field of BRAND_FIELD_NAMES) {
    const spec = BRAND_FIELDS[field];
    const parsed = saved ? spec.parse(saved[field]) : undefined;
    seeded[field] = parsed ? parsed.value : spec.seed();
  }

  return seeded as BrandFormData;
}
