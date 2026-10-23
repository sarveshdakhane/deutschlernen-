import { describe, expect, it } from "vitest";
import { selectVocabularyWords } from "../../lib/vocabSelection";

// Deterministic seeded PRNG (mulberry32) so the statistical recency-bias
// test below is 100% reproducible instead of relying on true Math.random.
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOW = new Date("2026-10-23T00:00:00.000Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe("selectVocabularyWords", () => {
  it("excludes a word used within the cooldown window", () => {
    const categories = { Verben: ["a", "b", "c"] };
    const usedAt = { b: NOW.toISOString() };
    const result = selectVocabularyWords(categories, usedAt, 3, NOW, WEEK_MS, seededRandom(1));
    expect(result).not.toContain("b");
    expect(result.sort()).toEqual(["a", "c"]);
  });

  it("makes a word eligible again once its cooldown has expired", () => {
    const categories = { Verben: ["a", "b", "c"] };
    const usedAt = { b: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() };
    const result = selectVocabularyWords(categories, usedAt, 3, NOW, WEEK_MS, seededRandom(1));
    expect(result.sort()).toEqual(["a", "b", "c"]);
  });

  it("returns fewer than requested when not enough candidates remain", () => {
    const categories = { Verben: ["a", "b", "c"] };
    const usedAt = { a: NOW.toISOString(), b: NOW.toISOString() };
    const result = selectVocabularyWords(categories, usedAt, 5, NOW, WEEK_MS, seededRandom(1));
    expect(result).toEqual(["c"]);
  });

  it("returns an empty array when every candidate is on cooldown", () => {
    const categories = { Verben: ["a", "b"] };
    const usedAt = { a: NOW.toISOString(), b: NOW.toISOString() };
    const result = selectVocabularyWords(categories, usedAt, 3, NOW, WEEK_MS, seededRandom(1));
    expect(result).toEqual([]);
  });

  it("round-robins across categories instead of draining one before touching another", () => {
    const categories = { Verben: ["v1", "v2", "v3", "v4"], Nomen: ["n1"] };
    const result = selectVocabularyWords(categories, {}, 3, NOW, WEEK_MS, seededRandom(42));
    // Nomen only has one word — round-robin guarantees it gets visited on
    // the first pass before Verben can claim a second pick, regardless of
    // which specific weighted draw happens within each category.
    expect(result).toContain("n1");
    expect(result.length).toBe(3);
  });

  it("never returns more words than requested", () => {
    const categories = { Verben: ["a", "b", "c", "d", "e"] };
    const result = selectVocabularyWords(categories, {}, 2, NOW, WEEK_MS, seededRandom(7));
    expect(result.length).toBe(2);
  });

  it("biases toward more recently added words without excluding older ones", () => {
    const categories = { Verben: ["old", "mid", "new"] };
    const random = seededRandom(123);
    let oldCount = 0;
    let newCount = 0;
    const trials = 3000;

    for (let i = 0; i < trials; i++) {
      const [picked] = selectVocabularyWords(categories, {}, 1, NOW, WEEK_MS, random);
      if (picked === "old") oldCount++;
      if (picked === "new") newCount++;
    }

    // "new" (weight 1.0) should be picked meaningfully more often than
    // "old" (weight ~0.53), but "old" must still appear sometimes — this is
    // a bias, not an exclusion (per the user: practice should span
    // everything logged, not just the newest entries).
    expect(newCount).toBeGreaterThan(oldCount);
    expect(oldCount).toBeGreaterThan(0);
  });
});
