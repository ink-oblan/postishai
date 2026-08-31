import { beforeEach, describe, expect, it } from "vitest";
import {
  changedFields,
  draftKey,
  previousValues,
  readDraft,
  restorableChanges,
  writeDraft,
} from "../draft";

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

/** An uploaded asset as it comes back from Prisma, asset id and all. */
const savedLogo = {
  logoPath: [{ id: "a", name: "logo.png", assetId: "clxasset1" }],
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

  it("ignores the fresh asset id a re-added image gets", () => {
    const reAdded = '[{"id":"b","name":"logo.png","assetId":"clxasset2"}]';

    expect(changedFields({ logoPath: reAdded }, savedLogo)).toEqual({});
  });

  it("still catches a different file swapped in", () => {
    const renamed = [{ id: "b", name: "mark.png", assetId: "clxasset2" }];

    expect(changedFields({ logoPath: renamed }, savedLogo)).toEqual({ logoPath: renamed });
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

  it("ignores drafts stamped with another version", () => {
    writeDraft(KEY, { step: 1, changes: { brandName: "Acme Co" } });
    const stored = JSON.parse(localStorage.getItem(KEY) as string);
    localStorage.setItem(KEY, JSON.stringify({ ...stored, version: stored.version - 1 }));

    expect(readDraft(KEY)).toBeNull();
  });

  it("ignores unparseable entries", () => {
    localStorage.setItem(KEY, "not json");
    expect(readDraft(KEY)).toBeNull();
  });
});

describe("restorableChanges", () => {
  it("keeps edits the field registry can still read", () => {
    const changes = {
      brandName: "Acme Co",
      emojiLevel: 2,
      colors: [{ id: "c2", name: "Leaf", hex: "#00ff00" }],
    };

    expect(restorableChanges(changes)).toEqual(changes);
  });

  it("drops a field the form no longer has", () => {
    expect(restorableChanges({ brandName: "Acme Co", retired: "gone" })).toEqual({
      brandName: "Acme Co",
    });
  });

  it("drops a field whose value the form can no longer take", () => {
    // An emoji level as a label, and one past the top of the scale.
    expect(restorableChanges({ brandName: "Acme Co", emojiLevel: "high" })).toEqual({
      brandName: "Acme Co",
    });
    expect(restorableChanges({ emojiLevel: 9 })).toEqual({});
  });

  it("reads a list an older wizard stored as a JSON string", () => {
    expect(restorableChanges({ colors: '[{"id":"c2","name":"Leaf","hex":"#00ff00"}]' })).toEqual({
      colors: [{ id: "c2", name: "Leaf", hex: "#00ff00" }],
    });
  });

  it("refuses a list rather than restoring part of one", () => {
    // Restoring only the readable colour and then saving would delete the other.
    expect(restorableChanges({ colors: [{ hex: "#00ff00" }, { hex: "not a colour" }] })).toEqual(
      {},
    );
  });

  it("fills in what an entry leaves out, so the form only holds values it could produce", () => {
    expect(restorableChanges({ typography: [{ name: "Inter" }] })).toEqual({
      typography: [{ id: "", name: "Inter", source: "builtin" }],
    });
  });

  it("restores nothing when every edit is stale", () => {
    expect(restorableChanges({ retired: "gone", emojiLevel: "high" })).toEqual({});
  });

  it("tells an empty list apart from an empty string", () => {
    expect(restorableChanges({ colors: [] })).toEqual({ colors: [] });
    expect(restorableChanges({ colors: "" })).toEqual({});
  });

  it("ignores a field the draft never touched", () => {
    expect(restorableChanges({})).toEqual({});
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
