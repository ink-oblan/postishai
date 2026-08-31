import { describe, expect, it } from "vitest";
import { seedFormData } from "@/lib/brand-fields";
import { isStepValid, validateStep } from "../validation";

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
});
