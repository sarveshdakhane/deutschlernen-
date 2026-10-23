import { describe, expect, it } from "vitest";
import { extractHeadword, groupByCategory, mergeCategorized } from "../../lib/notionVocabParser";

describe("extractHeadword", () => {
  it("extracts the word from an em-dash separated entry", () => {
    expect(extractHeadword("abreisen — to depart")).toBe("abreisen");
  });

  it("extracts the word from a plain-hyphen separated entry", () => {
    expect(extractHeadword("Regierung - Government")).toBe("Regierung");
  });

  it("extracts the word from an en-dash separated entry", () => {
    expect(extractHeadword("der Rand – edge")).toBe("der Rand");
  });

  it("does not split on a bare hyphen with no surrounding spaces", () => {
    // "E-Mail" must not be chopped at the hyphen just because a dash exists
    // somewhere in the string.
    expect(extractHeadword("per E-Mail — by email")).toBe("per E-Mail");
  });

  it("takes only the first alternate form when / separates multiple forms", () => {
    expect(extractHeadword("abreisen / ist abgereist — to depart / departed")).toBe("abreisen");
  });

  it("takes only the first alternate form when ↔ separates opposites", () => {
    expect(extractHeadword("anwesend ↔ abwesend — present ↔ absent")).toBe("anwesend");
  });

  it("returns null for lines with no word/meaning separator", () => {
    expect(extractHeadword("*More verbs with look-alikes → see 6. Differences*")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractHeadword("   ")).toBeNull();
  });
});

describe("groupByCategory", () => {
  it("groups bullets under the nearest preceding heading, preserving order", () => {
    const result = groupByCategory([
      { kind: "heading", text: "Verben" },
      { kind: "bullet", text: "abreisen — to depart" },
      { kind: "bullet", text: "beginnen — to begin" },
      { kind: "heading", text: "Nomen" },
      { kind: "bullet", text: "die Broschüre — brochure" },
    ]);

    expect(result).toEqual({
      Verben: ["abreisen", "beginnen"],
      Nomen: ["die Broschüre"],
    });
  });

  it("falls back to a 'General' bucket when there's no heading yet", () => {
    const result = groupByCategory([{ kind: "bullet", text: "hallo — hello" }]);
    expect(result).toEqual({ General: ["hallo"] });
  });

  it("skips bullets that don't parse as word/meaning entries", () => {
    const result = groupByCategory([
      { kind: "heading", text: "Verben" },
      { kind: "bullet", text: "abreisen — to depart" },
      { kind: "bullet", text: "*an aside with no separator*" },
    ]);
    expect(result).toEqual({ Verben: ["abreisen"] });
  });
});

describe("mergeCategorized", () => {
  it("concatenates same-named categories across columns, preserving each column's order", () => {
    const merged = mergeCategorized([
      { Verben: ["abreisen", "beginnen"] },
      { Verben: ["verbessern"], Nomen: ["der Rand"] },
    ]);
    expect(merged).toEqual({
      Verben: ["abreisen", "beginnen", "verbessern"],
      Nomen: ["der Rand"],
    });
  });

  it("returns an empty object for no input", () => {
    expect(mergeCategorized([])).toEqual({});
  });
});
