/**
 * A draft holds only the fields that drift from what the wizard was opened with — the saved
 * brand when editing, empty values when creating. So a stored draft existing at all already
 * means "there are unsaved edits"; nothing has to be compared again at read time.
 */
export interface BrandWizardDraft {
  step: number;
  changes: Record<string, unknown>;
}

/**
 * Drafts are namespaced per user and per brand — a shared key would make the draft of
 * one brand (or of "create new") bleed into the edit form of another.
 */
export function draftKey(userId: string, brandProfileId?: string): string {
  return `brandWizard:${userId}:${brandProfileId ?? "new"}`;
}

/**
 * The stored entry is only trusted as far as its shape holds up: anything that isn't a
 * non-empty set of changes is treated as no draft at all, whoever or whatever wrote it.
 */
export function readDraft(key: string): BrandWizardDraft | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    const changes =
      parsed?.changes && typeof parsed.changes === "object" ? parsed.changes : undefined;
    if (!changes || Object.keys(changes).length === 0) return null;

    return { step: Number.isInteger(parsed.step) ? parsed.step : 0, changes };
  } catch (e) {
    console.error("Failed to parse saved brand wizard draft:", e);
    return null;
  }
}

/** An empty diff clears the entry, so presence never outlives the edits it stands for. */
export function writeDraft(key: string, draft: BrandWizardDraft): void {
  if (Object.keys(draft.changes).length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(draft));
}

/** Lists tell themselves apart from the objects they are; `typeof` covers the rest. */
const shapeOf = (value: unknown) => (Array.isArray(value) ? "list" : typeof value);

/**
 * Drafts outlive the form that wrote them. The values the wizard seeds itself with are both
 * the fields it still has and the shape each one holds, so an edit is restored only where it
 * matches its seed: a field the form dropped has no seed at all, and one that changed shape no
 * longer matches its own. Both go quietly; the rest of the draft is still unsaved work.
 *
 * Shapes, not structure — a list whose entries changed still reads as a list. Changing what an
 * entry holds means tolerating both forms on read, the way `parseList` does, or renaming the
 * field so its old drafts stop matching.
 */
export function restorableChanges(
  changes: Record<string, unknown>,
  baseline: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).filter(([field, value]) => shapeOf(value) === shapeOf(baseline[field])),
  );
}

/**
 * Values survive a JSON round-trip in localStorage, so JSON strings compare reliably —
 * but the wizard seeds empty fields with "" where the database holds null.
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return JSON.stringify(canonicalize(parseJson(value)));
}

/**
 * Json columns arrive from Prisma already parsed, while the list pickers hand their field
 * back as a JSON string once edited. Both shapes have to meet before they can compare.
 */
function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" ? parsed : value;
  } catch {
    return value;
  }
}

/**
 * Keys that identify an entry's storage rather than its content, and so must not count as
 * an edit. `id` is minted fresh per entry by the pickers, and `assetId` per upload — so
 * removing a font, colour or image and adding the same one back would otherwise read as an
 * unsaved change forever. What is left — `name`, and whatever else the entry describes itself
 * with — is the same identity `previewFieldValue` diffs on.
 */
const VOLATILE_KEYS = new Set(["id", "assetId"]);

/** Sorts keys so serialization order can't stand in for a real edit. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

/** The subset of `current` that differs from `baseline`, keyed by field name. */
export function changedFields(
  current: Record<string, unknown>,
  baseline: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => normalizeValue(value) !== normalizeValue(baseline[key]),
    ),
  );
}

export interface FieldChange {
  /** What the field held before the edit — what its badge shows on hover. */
  original: unknown;
  /** The edited value, which the badge needs to point out what the edit dropped. */
  current: unknown;
}

export type FieldChanges = Record<string, FieldChange | undefined>;

/** Pairs each edited field's current value with the one the wizard was opened with. */
export function previousValues(
  changes: Record<string, unknown>,
  baseline: Record<string, unknown>,
): FieldChanges {
  return Object.fromEntries(
    Object.entries(changes).map(([field, value]) => [
      field,
      { original: baseline[field], current: value },
    ]),
  );
}
