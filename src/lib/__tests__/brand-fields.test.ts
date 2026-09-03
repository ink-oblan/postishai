import { describe, expect, it } from "vitest";
import {
  ASSET_FIELDS,
  BRAND_FIELD_NAMES,
  isBrandField,
  isFieldSet,
  isListField,
  isValidHexColor,
  MAX_TEXT_LENGTH,
  parseWholeField,
  seedFormData,
  validateField,
} from "../brand-fields";

describe("seedFormData", () => {
  it("opens a new brand on the wizard's own defaults", () => {
    const seeded = seedFormData(null);

    expect(seeded.brandName).toBe("");
    expect(seeded.colors).toEqual([]);
    // Unset rather than on a default: the user has to answer the two tone questions themselves.
    expect(seeded.youFormality).toBeNull();
    expect(seeded.emojiLevel).toBeNull();
  });

  it("gives each seed its own list, so one brand's edits can't reach another's", () => {
    expect(seedFormData(null).colors).not.toBe(seedFormData(null).colors);
  });

  it("keeps a saved level of 0, which is an answer and not an absent one", () => {
    expect(seedFormData({ emojiLevel: 0 }).emojiLevel).toBe(0);
    expect(seedFormData({ youFormality: false }).youFormality).toBe(false);
  });

  it("reads null columns as the empty values the form shows", () => {
    const seeded = seedFormData({ mission: null, colors: null, photoStyle: null });

    expect(seeded.mission).toBe("");
    expect(seeded.colors).toEqual([]);
  });

  it("reads a list an older row stored as a JSON string", () => {
    expect(seedFormData({ colors: '[{"id":"c1","name":"Brick","hex":"#ff0000"}]' }).colors).toEqual(
      [{ id: "c1", name: "Brick", hex: "#ff0000" }],
    );
  });

  it("shows the rest of a list when one entry can't be read", () => {
    // Tolerant on purpose: a row holding one bad colour is still the user's palette.
    const colors = seedFormData({
      colors: [{ id: "c1", name: "Brick", hex: "#ff0000" }, { name: "Mystery" }],
    }).colors;

    expect(colors).toEqual([{ id: "c1", name: "Brick", hex: "#ff0000" }]);
  });

  it("falls back to the default when the column holds nothing the form can use", () => {
    expect(seedFormData({ colors: { hex: "#ff0000" } }).colors).toEqual([]);
    expect(seedFormData({ brandName: 42 }).brandName).toBe("");
  });
});

describe("parseWholeField", () => {
  it("takes a value the form could have produced itself", () => {
    expect(parseWholeField("brandName", "Acme")).toBe("Acme");
    expect(parseWholeField("youFormality", true)).toBe(true);
    expect(parseWholeField("emojiLevel", 0)).toBe(0);
  });

  it("refuses a value of the wrong type", () => {
    expect(parseWholeField("brandName", 42)).toBeUndefined();
    expect(parseWholeField("youFormality", "yes")).toBeUndefined();
    expect(parseWholeField("emojiLevel", "high")).toBeUndefined();
  });

  it("refuses a level outside the scale the form offers", () => {
    expect(parseWholeField("emojiLevel", -1)).toBeUndefined();
    expect(parseWholeField("emojiLevel", 4)).toBeUndefined();
    expect(parseWholeField("emojiLevel", 1.5)).toBeUndefined();
  });

  it("refuses text past the storage cap", () => {
    expect(parseWholeField("mission", "x".repeat(MAX_TEXT_LENGTH))).toHaveLength(MAX_TEXT_LENGTH);
    expect(parseWholeField("mission", "x".repeat(MAX_TEXT_LENGTH + 1))).toBeUndefined();
  });

  it("refuses a list rather than storing part of one", () => {
    expect(parseWholeField("colors", [{ hex: "#ff0000" }, { hex: 42 }])).toBeUndefined();
    expect(parseWholeField("typography", [{ name: "Inter" }, {}])).toBeUndefined();
    expect(parseWholeField("logoPath", ["logo.png"])).toBeUndefined();
  });

  it("refuses a colour that isn't one", () => {
    expect(parseWholeField("colors", [{ hex: "red" }])).toBeUndefined();
    expect(parseWholeField("colors", [{ hex: "#ff00zz" }])).toBeUndefined();
    expect(parseWholeField("colors", [{ hex: "#ff0000" }])).toEqual([
      { id: "", name: "", hex: "#ff0000" },
    ]);
  });

  it("reads a font with no source as a library one, the way the badge does", () => {
    expect(parseWholeField("typography", [{ id: "f1", name: "Inter" }])).toEqual([
      { id: "f1", name: "Inter", source: "builtin" },
    ]);
    expect(
      parseWholeField("typography", [{ id: "f1", name: "B.ttf", source: "uploaded" }]),
    ).toEqual([{ id: "f1", name: "B.ttf", source: "uploaded" }]);
  });

  it("keeps the asset id an uploaded entry carries and invents none", () => {
    expect(parseWholeField("logoPath", [{ id: "a", name: "logo.png", assetId: "clx1" }])).toEqual([
      { id: "a", name: "logo.png", assetId: "clx1" },
    ]);
    expect(parseWholeField("logoPath", [{ id: "a", name: "logo.png" }])).toEqual([
      { id: "a", name: "logo.png" },
    ]);
  });

  it("takes an empty list as an emptied one", () => {
    expect(parseWholeField("colors", [])).toEqual([]);
  });
});

describe("isValidHexColor", () => {
  it("accepts the shorthand and full forms the pickers emit", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#ff0000")).toBe(true);
    expect(isValidHexColor("#ff0000ff")).toBe(true);
  });

  it("rejects a code that's cut short or isn't hex at all", () => {
    expect(isValidHexColor("#12")).toBe(false);
    // Lengths between the real forms: hex digits, but no colour anything can render or edit.
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#1234567")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#ff00zz")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("the registry itself", () => {
  it("recognises its own fields and nothing else", () => {
    expect(isBrandField("brandName")).toBe(true);
    expect(isBrandField("userId")).toBe(false);
    expect(isBrandField("toString")).toBe(false);
  });

  it("knows which fields hold lists", () => {
    expect(BRAND_FIELD_NAMES.filter(isListField)).toEqual([
      "colors",
      "typography",
      "logoPath",
      "patterns",
    ]);
  });

  it("derives the fields that carry assets", () => {
    expect(ASSET_FIELDS).toEqual(["typography", "logoPath", "patterns"]);
  });
});

describe("isFieldSet", () => {
  it("reads the two choice fields by whether they were answered, not by truthiness", () => {
    expect(isFieldSet("youFormality", false)).toBe(true);
    expect(isFieldSet("emojiLevel", 0)).toBe(true);
    expect(isFieldSet("youFormality", null)).toBe(false);
    expect(isFieldSet("emojiLevel", null)).toBe(false);
  });

  it("takes whitespace as an unfilled text field", () => {
    expect(isFieldSet("brandName", "Acme")).toBe(true);
    expect(isFieldSet("brandName", "   ")).toBe(false);
    expect(isFieldSet("brandName", "")).toBe(false);
  });

  it("takes an empty list as unset", () => {
    expect(isFieldSet("colors", [{ hex: "#ff0000" }])).toBe(true);
    expect(isFieldSet("colors", [])).toBe(false);
    expect(isFieldSet("colors", null)).toBe(false);
  });
});

describe("validateField", () => {
  it("reports an untouched required field as unanswered, not as too short", () => {
    expect(validateField("brandName", "")).toMatchObject({
      field: "brandName",
      kind: "incomplete",
      message: "Brand Name is required",
    });
  });

  it("falls through to the bounds once the field holds something", () => {
    expect(validateField("brandName", "Ac")).toMatchObject({
      kind: "incomplete",
      current: 2,
      required: 3,
    });
    expect(validateField("brandName", "Acme")).toBeNull();
  });

  it("holds a brand whose tone questions were never answered", () => {
    expect(validateField("youFormality", null)).toMatchObject({ kind: "incomplete" });
    expect(validateField("emojiLevel", null)).toMatchObject({ kind: "incomplete" });

    expect(validateField("youFormality", false)).toBeNull();
    expect(validateField("emojiLevel", 0)).toBeNull();
  });

  it("separates a value still being filled in from one that is wrong", () => {
    expect(validateField("photoStyle", "x".repeat(301))).toMatchObject({
      field: "photoStyle",
      kind: "invalid",
      current: 301,
      required: 300,
    });
  });

  it("counts entries, not characters, for a list field", () => {
    expect(validateField("colors", [{ hex: "#ff0000" }])).toMatchObject({
      field: "colors",
      kind: "incomplete",
      current: 1,
      required: 2,
    });
  });

  it("passes a field with no declared bounds, however long it runs", () => {
    expect(validateField("logoPath", [])).toBeNull();
  });

  it("leaves an optional field alone when it's empty", () => {
    expect(validateField("photoStyle", "")).toBeNull();
    expect(validateField("logoPath", [])).toBeNull();
  });
});
