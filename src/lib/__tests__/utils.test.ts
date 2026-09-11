import { describe, expect, it } from "vitest";
import { wrapIndex } from "@/lib/utils";

describe("wrapIndex", () => {
  it("leaves an in-range index alone", () => {
    expect(wrapIndex(2, 5)).toBe(2);
  });

  it("wraps past the end back to the start", () => {
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(6, 5)).toBe(1);
  });

  it("wraps before the start back to the end", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-6, 5)).toBe(4);
  });

  it("returns zero for an empty list", () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});
