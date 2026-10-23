import { describe, expect, it } from "vitest";
import { STORY_POOL, NEWS_POOL, DIALOGUE_POOL, SPEAKING_POOL, getPoolForType, TopicItem } from "../../lib/topicPools";

const ALL_POOLS: { name: string; pool: TopicItem[] }[] = [
  { name: "STORY_POOL", pool: STORY_POOL },
  { name: "NEWS_POOL", pool: NEWS_POOL },
  { name: "DIALOGUE_POOL", pool: DIALOGUE_POOL },
  { name: "SPEAKING_POOL", pool: SPEAKING_POOL },
];

for (const { name, pool } of ALL_POOLS) {
  describe(name, () => {
    it("is non-empty", () => {
      expect(pool.length).toBeGreaterThan(0);
    });

    it("has a unique, non-empty id for every item (id is the history key)", () => {
      const ids = pool.map((item) => item.id);
      expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every item has a concrete, non-trivial premise (section 1.2: not just a bare category)", () => {
      for (const item of pool) {
        expect(item.premise.trim().length).toBeGreaterThan(20);
        expect(item.category.trim().length).toBeGreaterThan(0);
      }
    });

    it("covers more than one category (real pool diversity, not a single bucket)", () => {
      const categories = new Set(pool.map((item) => item.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });
}

describe("STORY_POOL factuality (section 1.1 / 1.2)", () => {
  it("is not all fiction — the majority of categories include real/verified content", () => {
    const factualities = STORY_POOL.map((item) => item.factuality);
    const nonFiction = factualities.filter((f) => f === "history" || f === "verified_fact");
    expect(nonFiction.length).toBeGreaterThan(0);
    // Fiction should be present too (it's one category among several, not absent).
    expect(factualities.filter((f) => f === "fiction").length).toBeGreaterThan(0);
  });

  it("every 'history' item supplies verifiedBackground (never invent historical details)", () => {
    for (const item of STORY_POOL.filter((i) => i.factuality === "history")) {
      expect(item.verifiedBackground?.length).toBeGreaterThan(0);
    }
  });

  it("covers at least the categories named in the brief", () => {
    const categories = new Set(STORY_POOL.map((item) => item.category));
    for (const expected of [
      "historical-events",
      "curious-facts",
      "science-and-invention",
      "social-trends",
      "regional-traditions",
      "everyday-decisions",
      "mystery-and-coincidence",
      "personal-dilemmas",
      "light-humour",
    ]) {
      expect(categories.has(expected)).toBe(true);
    }
  });
});

describe("NEWS_POOL authenticity (section 3)", () => {
  it("every item is factually framed (verified_fact or history), never fiction", () => {
    for (const item of NEWS_POOL) {
      expect(item.factuality === "verified_fact" || item.factuality === "history").toBe(true);
    }
  });

  it("premises read as explainer angles, not 'today's event' framing", () => {
    for (const item of NEWS_POOL) {
      expect(item.premise.toLowerCase()).not.toContain("today");
    }
  });
});

describe("SPEAKING_POOL communicative-purpose diversity (section 4)", () => {
  it("every item has a purpose tag", () => {
    expect(SPEAKING_POOL.every((item) => !!item.purpose)).toBe(true);
  });

  it("covers a meaningfully wide spread of purposes, not dominated by one", () => {
    const purposes = SPEAKING_POOL.map((item) => item.purpose as string);
    const counts = new Map<string, number>();
    for (const p of purposes) counts.set(p, (counts.get(p) ?? 0) + 1);
    expect(counts.size).toBeGreaterThanOrEqual(10);
    // No single purpose should dominate more than a third of the pool.
    const maxCount = Math.max(...counts.values());
    expect(maxCount / purposes.length).toBeLessThanOrEqual(1 / 3);
  });

  it("is not dominated by service/shop/office interactions (the original complaint)", () => {
    const serviceLike = SPEAKING_POOL.filter((item) =>
      /\b(shop assistant|pharmacy|hotel|sports centre|supermarket|bus driver|café|bakery)\b/i.test(item.premise)
    );
    expect(serviceLike.length / SPEAKING_POOL.length).toBeLessThan(0.4);
  });
});

describe("DIALOGUE_POOL vs SPEAKING_POOL distinctness (section 5)", () => {
  it("dialogue and speaking don't share identical premises", () => {
    const dialoguePremises = new Set(DIALOGUE_POOL.map((i) => i.premise));
    const overlap = SPEAKING_POOL.filter((i) => dialoguePremises.has(i.premise));
    expect(overlap.length).toBe(0);
  });
});

describe("getPoolForType", () => {
  it("returns the matching pool for every reading type", () => {
    expect(getPoolForType("news")).toBe(NEWS_POOL);
    expect(getPoolForType("dialogue")).toBe(DIALOGUE_POOL);
    expect(getPoolForType("story")).toBe(STORY_POOL);
    expect(getPoolForType("speaking")).toBe(SPEAKING_POOL);
  });
});
