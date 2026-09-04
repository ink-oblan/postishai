import { describe, expect, it } from "vitest";
import { seedFormData } from "@/lib/brand-fields";
import {
  firstInvalidStep,
  isStepValid,
  shownError,
  stepValidation,
  validateStep,
} from "../validation";

/** A brand filled in far enough to clear every step. */
const complete = {
  ...seedFormData(null),
  brandName: "Acme",
  topic: "Coffee",
  targetAudience: "Independent roasters who sell their own beans online",
  colors: [
    { id: "c1", name: "Brick", hex: "#ff0000" },
    { id: "c2", name: "Leaf", hex: "#00ff00" },
  ],
  typography: [{ id: "f1", name: "Inter", source: "builtin" as const }],
  youFormality: true,
  emojiLevel: 1,
};

describe("validateStep", () => {
  it("passes a completed form on every step", () => {
    expect([0, 1, 2, 3].filter((step) => !isStepValid(step, complete))).toEqual([]);
  });

  it("holds step 1 until the required fields are long enough", () => {
    expect(validateStep(0, { ...complete, brandName: "" })).toHaveLength(1);
    expect(validateStep(0, { ...complete, brandName: "Ac" })).toHaveLength(1);
    expect(validateStep(0, { ...complete, targetAudience: "Roasters" })).toHaveLength(1);
  });

  it("lets an optional field be empty but not overlong", () => {
    expect(validateStep(0, { ...complete, mission: "" })).toEqual([]);
    expect(validateStep(0, { ...complete, mission: "x".repeat(501) })).toHaveLength(1);
  });

  it("counts entries, not characters, for the list fields", () => {
    expect(validateStep(1, { ...complete, colors: complete.colors.slice(0, 1) })).toHaveLength(1);
    expect(validateStep(1, { ...complete, typography: [] })).toHaveLength(1);
  });

  it("lets the optional descriptor fields be empty but not overlong", () => {
    expect(validateStep(1, { ...complete, photoStyle: "" })).toEqual([]);
    expect(validateStep(1, { ...complete, photoStyle: "x".repeat(301) })).toHaveLength(1);

    expect(validateStep(3, { ...complete, videoAnimations: "" })).toEqual([]);
    expect(validateStep(3, { ...complete, videoAnimations: "x".repeat(301) })).toHaveLength(1);

    expect(validateStep(3, { ...complete, videoTransitions: "" })).toEqual([]);
    expect(validateStep(3, { ...complete, videoTransitions: "x".repeat(301) })).toHaveLength(1);
  });

  it("checks a field only on the step that edits it", () => {
    const missingName = { ...complete, brandName: "" };

    expect(validateStep(0, missingName)).toHaveLength(1);
    expect(validateStep(1, missingName)).toEqual([]);
  });

  it("names the field that failed, so a caller can point at it", () => {
    expect(validateStep(1, { ...complete, colors: [] })[0]).toMatchObject({
      field: "colors",
      current: 0,
      required: 2,
    });
  });

  it("holds step 2 on a color that isn't a valid hex code", () => {
    const badColors = [...complete.colors, { id: "c3", name: "Mystery", hex: "#12" }];

    expect(validateStep(1, { ...complete, colors: badColors })).toHaveLength(1);
    expect(validateStep(1, { ...complete, colors: badColors })[0]).toMatchObject({
      field: "colors",
    });
  });

  it("passes a full set of valid hex codes", () => {
    expect(validateStep(1, complete)).toEqual([]);
  });

  it("holds step 3 until both tone questions have been answered", () => {
    expect(validateStep(2, { ...complete, youFormality: null })).toMatchObject([
      { field: "youFormality", kind: "incomplete" },
    ]);
    expect(validateStep(2, { ...complete, emojiLevel: null })).toMatchObject([
      { field: "emojiLevel", kind: "incomplete" },
    ]);
    // Both ends of each scale are answers, not absent ones.
    expect(validateStep(2, { ...complete, youFormality: false, emojiLevel: 0 })).toEqual([]);
  });
});

describe("shownError", () => {
  const unfinished = { ...complete, brandName: "", photoStyle: "x".repeat(301) };

  it("keeps an unfinished field quiet until the user tries to move on", () => {
    expect(shownError(stepValidation(0, unfinished, false), "brandName")).toBeNull();
    expect(shownError(stepValidation(0, unfinished, true), "brandName")).toMatchObject({
      field: "brandName",
    });
  });

  it("says so straight away when a value is wrong rather than unfinished", () => {
    expect(shownError(stepValidation(1, unfinished, false), "photoStyle")).toMatchObject({
      field: "photoStyle",
      kind: "invalid",
    });
  });

  it("has nothing to say about a field that passes", () => {
    expect(shownError(stepValidation(0, complete, true), "brandName")).toBeNull();
  });
});

describe("firstInvalidStep", () => {
  it("finds the step a save has to go back to", () => {
    expect(firstInvalidStep(complete, 4)).toBeNull();
    expect(firstInvalidStep({ ...complete, brandName: "" }, 4)).toBe(0);
    expect(firstInvalidStep({ ...complete, typography: [] }, 4)).toBe(1);
    expect(firstInvalidStep({ ...complete, emojiLevel: null }, 4)).toBe(2);
  });

  it("reports the earliest one, not the one the user is looking at", () => {
    expect(firstInvalidStep({ ...complete, brandName: "", emojiLevel: null }, 4)).toBe(0);
  });
});
