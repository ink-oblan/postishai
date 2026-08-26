/**
 * A draft holds only the fields that drift from what the wizard was opened with — the saved
 * brand when editing, empty values when creating. So a stored draft existing at all already
 * means "there are unsaved edits"; nothing has to be compared again at read time.
 */
export interface BrandWizardDraft {
  step: number;
  changes: Record<string, unknown>;
}

/** Bumped when the stored shape changes; drafts written by an older version are ignored. */
const DRAFT_VERSION = 2;

/**
 * Drafts are namespaced per user and per brand — a shared key would make the draft of
 * one brand (or of "create new") bleed into the edit form of another.
 */
export function draftKey(userId: string, brandProfileId?: string): string {
  return `brandWizard:${userId}:${brandProfileId ?? "new"}`;
}

export function readDraft(key: string): BrandWizardDraft | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    if (parsed?.version !== DRAFT_VERSION) return null;

    const changes =
      parsed.changes && typeof parsed.changes === "object" ? parsed.changes : undefined;
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
  localStorage.setItem(key, JSON.stringify({ version: DRAFT_VERSION, ...draft }));
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
 * Sorts keys so serialization order can't stand in for a real edit, and drops `id`: the
 * pickers mint a fresh random one per entry, so removing a font or colour and adding the
 * same one back would otherwise read as an unsaved change forever.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "id")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [
        key,
        key === "storagePath" && typeof entry === "string"
          ? assetIdentity(entry)
          : canonicalize(entry),
      ]),
  );
}

/**
 * Re-adding a file re-uploads it, and every upload lands at its own
 * `brand-assets/<user>/<type>/<timestamp>-<name>` path — so the same image put back would
 * compare unequal to the one already saved. The file name is the part that identifies the
 * asset to the user; for images the dimensions ride alongside it in the same entry and
 * catch a genuinely different file that happens to share a name.
 */
function assetIdentity(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/^\d+-/, "");
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
