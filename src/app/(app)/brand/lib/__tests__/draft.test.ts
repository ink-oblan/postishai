import { beforeEach, describe, expect, it } from "vitest";
import { changedFields, draftKey, previousValues, readDraft, writeDraft } from "../draft";

const USER = "clx1user0000000000000000";
const BRAND = "clx2brand000000000000000";
const KEY = draftKey(USER, BRAND);

/** What the wizard seeds from a saved brand: null columns become empty strings. */
const saved = {
  brandName: "Acme",
  mission: "",
  topic: "Coffee",
  colors: [{ id: "c1", hex: "#ff0000" }],
  photoStyle: "",
  youFormality: false,
  emojiLevel: 0,
};

describe("draftKey", () => {
  it("namespaces new-brand drafts separately from per-brand drafts", () => {
    expect(draftKey(USER)).toBe(`brandWizard:${USER}:new`);
    expect(draftKey(USER, BRAND)).toBe(`brandWizard:${USER}:${BRAND}`);
  });
});

/** An uploaded asset as it comes back from Prisma, path timestamp and all. */
const savedLogo = {
  logoPath: [
    {
      id: "a",
      name: "logo.png",
      storagePath: "brand-assets/u1/logo/1700-logo.png",
      width: 512,
    },
  ],
};

describe("changedFields", () => {
  it("returns nothing for an untouched form", () => {
    expect(changedFields({ ...saved }, saved)).toEqual({});
  });

  it("treats null in the database as equal to the wizard's empty string", () => {
    expect(changedFields({ mission: "" }, { mission: null })).toEqual({});
  });

  it("returns only the edited fields", () => {
    expect(changedFields({ ...saved, brandName: "Acme Co" }, saved)).toEqual({
      brandName: "Acme Co",
    });
  });

  it("compares json values structurally, not by reference", () => {
    expect(changedFields({ colors: [{ id: "c1", hex: "#ff0000" }] }, saved)).toEqual({});
    expect(changedFields({ colors: [{ id: "c1", hex: "#00ff00" }] }, saved)).toEqual({
      colors: [{ id: "c1", hex: "#00ff00" }],
    });
  });

  it("compares a picker's JSON string against the parsed Json column", () => {
    expect(changedFields({ colors: '[{"id":"c1","hex":"#ff0000"}]' }, saved)).toEqual({});
    expect(changedFields({ colors: '[{"id":"c1","hex":"#00ff00"}]' }, saved)).toEqual({
      colors: '[{"id":"c1","hex":"#00ff00"}]',
    });
  });

  it("ignores the fresh ids the pickers mint when an entry is removed and re-added", () => {
    expect(changedFields({ colors: [{ id: "c2-1731", hex: "#ff0000" }] }, saved)).toEqual({});
    expect(
      changedFields(
        { typography: '[{"id":"9fz2","name":"Inter","source":"builtin"}]' },
        { typography: [{ id: "kq10", name: "Inter", source: "builtin" }] },
      ),
    ).toEqual({});
  });

  it("ignores the fresh upload path a re-added image gets", () => {
    const reAdded =
      '[{"id":"b","name":"logo.png","storagePath":"brand-assets/u1/logo/1899-logo.png","width":512}]';

    expect(changedFields({ logoPath: reAdded }, savedLogo)).toEqual({});
  });

  it("still catches a different file swapped in", () => {
    const renamed = [
      { id: "b", name: "mark.png", storagePath: "brand-assets/u1/logo/1899-mark.png", width: 512 },
    ];
    const resized = [
      { id: "b", name: "logo.png", storagePath: "brand-assets/u1/logo/1899-logo.png", width: 256 },
    ];

    expect(changedFields({ logoPath: renamed }, savedLogo)).toEqual({ logoPath: renamed });
    expect(changedFields({ logoPath: resized }, savedLogo)).toEqual({ logoPath: resized });
  });

  it("ignores key order within a json value", () => {
    expect(changedFields({ colors: [{ hex: "#ff0000", id: "c1" }] }, saved)).toEqual({});
  });

  it("catches a field switched back to a falsy-but-valid value", () => {
    expect(changedFields({ emojiLevel: 3 }, saved)).toEqual({ emojiLevel: 3 });
    expect(changedFields({ youFormality: true }, saved)).toEqual({ youFormality: true });
  });
});

describe("writeDraft / readDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a draft", () => {
    writeDraft(KEY, { step: 2, changes: { brandName: "Acme Co" } });
    expect(readDraft(KEY)).toEqual({ step: 2, changes: { brandName: "Acme Co" } });
  });

  it("stores nothing when there are no changes", () => {
    writeDraft(KEY, { step: 2, changes: {} });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(readDraft(KEY)).toBeNull();
  });

  it("clears a previously stored draft once the edits are undone", () => {
    writeDraft(KEY, { step: 1, changes: { brandName: "Acme Co" } });
    writeDraft(KEY, { step: 1, changes: {} });
    expect(readDraft(KEY)).toBeNull();
  });

  it("ignores drafts written in an older format", () => {
    localStorage.setItem(KEY, JSON.stringify({ step: 1, formData: { brandName: "Acme Co" } }));
    expect(readDraft(KEY)).toBeNull();
  });

  it("ignores unparseable entries", () => {
    localStorage.setItem(KEY, "not json");
    expect(readDraft(KEY)).toBeNull();
  });
});

describe("previousValues", () => {
  it("pairs each changed field with the value it had when the wizard opened", () => {
    const changes = changedFields({ ...saved, brandName: "Acme Co", photoStyle: "Bright" }, saved);
    expect(previousValues(changes, saved)).toEqual({
      brandName: { original: "Acme", current: "Acme Co" },
      photoStyle: { original: "", current: "Bright" },
    });
  });
});
