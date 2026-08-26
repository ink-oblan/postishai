import { describe, expect, it } from "vitest";
import {
  diffEntries,
  diffText,
  formatFieldValue,
  previewFieldValue,
  truncate,
} from "../field-preview";

describe("previewFieldValue", () => {
  it("labels the choice behind a boolean or a level", () => {
    expect(previewFieldValue("youFormality", false)).toEqual({ kind: "text", text: "Formal" });
    expect(previewFieldValue("youFormality", true)).toEqual({ kind: "text", text: "Casual" });
    expect(previewFieldValue("emojiLevel", 0)).toEqual({ kind: "text", text: "No emojis" });
    expect(previewFieldValue("emojiLevel", 3)).toEqual({ kind: "text", text: "Very High" });
  });

  it("reads a list field from a JSON string or from the parsed Json column alike", () => {
    const parsed = previewFieldValue("colors", [{ id: "c1", name: "Brick", hex: "#ff0000" }]);
    const asString = previewFieldValue("colors", '[{"id":"c1","name":"Brick","hex":"#ff0000"}]');

    expect(parsed).toEqual({
      kind: "entries",
      entries: [{ key: "#ff0000", label: "Brick", swatch: "#ff0000" }],
    });
    expect(asString).toEqual(parsed);
  });

  it("falls back to the hex when a colour has no name", () => {
    expect(previewFieldValue("colors", [{ id: "c1", name: "", hex: "#00ff00" }])).toEqual({
      kind: "entries",
      entries: [{ key: "#00ff00", label: "#00ff00", swatch: "#00ff00" }],
    });
  });

  it("keeps repeated colours apart so the diff can pair them up", () => {
    const preview = previewFieldValue("colors", [{ hex: "#ff0000" }, { hex: "#ff0000" }]);

    expect(preview.kind === "entries" && preview.entries.map((entry) => entry.key)).toEqual([
      "#ff0000",
      "#ff0000#1",
    ]);
  });

  it("says where a font came from", () => {
    expect(
      previewFieldValue("typography", [
        { id: "f1", name: "Inter", source: "builtin" },
        { id: "f2", name: "Brand.ttf", source: "uploaded" },
      ]),
    ).toEqual({
      kind: "entries",
      entries: [
        { key: "inter", label: "Inter", meta: "Library" },
        { key: "brand.ttf", label: "Brand.ttf", meta: "Uploaded" },
      ],
    });
  });

  it("identifies an asset by name and size, never by its upload path", () => {
    const first = previewFieldValue("logoPath", [
      {
        name: "logo.png",
        storagePath: "brand-assets/u1/logo/1700-logo.png",
        width: 512,
        height: 512,
      },
    ]);
    const reAdded = previewFieldValue("logoPath", [
      {
        name: "logo.png",
        storagePath: "brand-assets/u1/logo/1899-logo.png",
        width: 512,
        height: 512,
      },
    ]);

    expect(first).toEqual({
      kind: "entries",
      entries: [{ key: "logo.png|512×512", label: "logo.png", meta: "512×512" }],
    });
    expect(reAdded).toEqual(first);
  });

  it("treats an empty list field as no entries at all", () => {
    expect(previewFieldValue("patterns", "")).toEqual({ kind: "entries", entries: [] });
    expect(previewFieldValue("patterns", null)).toEqual({ kind: "entries", entries: [] });
  });
});

describe("formatFieldValue", () => {
  it("flattens entries into one line for screen readers", () => {
    expect(
      formatFieldValue("colors", [{ name: "Brick", hex: "#ff0000" }, { hex: "#00ff00" }]),
    ).toBe("Brick, #00ff00");
    expect(formatFieldValue("typography", [{ name: "Inter", source: "builtin" }])).toBe(
      "Inter (Library)",
    );
  });

  it("calls an unset field empty", () => {
    expect(formatFieldValue("mission", "")).toBe("Empty");
    expect(formatFieldValue("logoPath", [])).toBe("Empty");
  });
});

describe("diffEntries", () => {
  it("keeps the previous order, marks what was dropped, appends what was added", () => {
    const previous = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ];
    const current = [
      { key: "b", label: "B" },
      { key: "c", label: "C" },
    ];

    expect(diffEntries(previous, current)).toEqual([
      { key: "a", label: "A", status: "removed" },
      { key: "b", label: "B", status: "same" },
      { key: "c", label: "C", status: "added" },
    ]);
  });

  it("marks everything added when the field was empty before", () => {
    expect(diffEntries([], [{ key: "a", label: "A" }])).toEqual([
      { key: "a", label: "A", status: "added" },
    ]);
  });
});

describe("diffText", () => {
  it("splits a short edit into what went out and what came in", () => {
    expect(diffText("No emojis", "Very High")).toEqual([
      { text: "No emojis", status: "removed" },
      { text: "Very High", status: "added" },
    ]);
  });

  it("keeps the untouched words around a pure addition", () => {
    expect(diffText("Acme", "Acme Co")).toEqual([
      { text: "Acme", status: "same" },
      { text: "Co", status: "added" },
    ]);
  });

  it("elides a long untouched opening down to a few words of context", () => {
    const opening = "We help small independent coffee roasters reach the people who";

    expect(diffText(`${opening} already love them`, `${opening} have never heard`)).toEqual([
      { text: "…reach the people who", status: "same" },
      { text: "already love them", status: "removed" },
      { text: "have never heard", status: "added" },
    ]);
  });

  it("elides a long untouched ending too", () => {
    const ending = "roasters reach the people who already love their coffee every single morning";

    expect(diffText(`We help small ${ending}`, `We serve large ${ending}`)).toEqual([
      { text: "We", status: "same" },
      { text: "help small", status: "removed" },
      { text: "serve large", status: "added" },
      { text: "roasters reach the people…", status: "same" },
    ]);
  });
});

describe("truncate", () => {
  it("cuts overlong text and marks the cut", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
    expect(truncate("abc", 3)).toBe("abc");
  });
});
