import { describe, expect, it } from "vitest";
import { selectTopic, seededIndex, TopicHistoryEntry } from "../../lib/topicSelection";
import { TopicItem } from "../../lib/topicPools";

function item(id: string, category: string): TopicItem {
  return { id, category, premise: `premise for ${id}` };
}

const POOL: TopicItem[] = [
  item("a", "cat1"),
  item("b", "cat1"),
  item("c", "cat2"),
  item("d", "cat2"),
  item("e", "cat3"),
];

describe("seededIndex", () => {
  it("is deterministic for the same seed", () => {
    expect(seededIndex("2026-10-23:story:v1", 10)).toBe(seededIndex("2026-10-23:story:v1", 10));
  });

  it("varies across different seeds (not a constant)", () => {
    const indices = new Set(
      ["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"].map((d) => seededIndex(`${d}:story:v1`, 100))
    );
    expect(indices.size).toBeGreaterThan(1);
  });

  it("always returns an index within range", () => {
    for (let i = 0; i < 50; i++) {
      const idx = seededIndex(`seed-${i}`, 7);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });
});

describe("selectTopic — determinism (section 7.2)", () => {
  it("returns the same item for the same seed + history every time", () => {
    const history: TopicHistoryEntry[] = [{ id: "a", category: "cat1", date: "2026-10-20" }];
    const options = { recentHistory: history, today: "2026-10-23" };
    const r1 = selectTopic(POOL, "2026-10-23:news:v1", options);
    const r2 = selectTopic(POOL, "2026-10-23:news:v1", options);
    expect(r1.item.id).toBe(r2.item.id);
  });

  it("does not use Math.random — two calls with identical inputs never diverge across many trials", () => {
    const options = { recentHistory: [], today: "2026-10-23" };
    const results = new Set(Array.from({ length: 20 }, () => selectTopic(POOL, "fixed-seed", options).item.id));
    expect(results.size).toBe(1);
  });
});

describe("selectTopic — recent-use exclusion (section 7.3)", () => {
  it("avoids an item used within the history window when alternatives exist", () => {
    // Exclude everything except "e" via history, across many seeds — "e"
    // should always win since it's the only non-excluded item.
    const history: TopicHistoryEntry[] = ["a", "b", "c", "d"].map((id) => ({
      id,
      category: POOL.find((p) => p.id === id)!.category,
      date: "2026-10-22",
    }));
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const result = selectTopic(POOL, seed, { recentHistory: history, today: "2026-10-23", windowDays: 18 });
      expect(result.item.id).toBe("e");
      expect(result.relaxed).toBe(false);
    }
  });

  it("ignores history entries outside the window", () => {
    const history: TopicHistoryEntry[] = [{ id: "a", category: "cat1", date: "2025-01-01" }]; // ancient
    const result = selectTopic(POOL, "seed", { recentHistory: history, today: "2026-10-23", windowDays: 18 });
    // "a" is NOT excluded (too old), so it's a valid candidate again —
    // we just confirm no error/empty-pool behavior occurs.
    expect(POOL.map((p) => p.id)).toContain(result.item.id);
  });

  it("relaxes gracefully (never throws) when history excludes the entire pool", () => {
    const history: TopicHistoryEntry[] = POOL.map((p) => ({ id: p.id, category: p.category, date: "2026-10-23" }));
    const result = selectTopic(POOL, "seed", { recentHistory: history, today: "2026-10-23" });
    expect(POOL.map((p) => p.id)).toContain(result.item.id);
    expect(result.relaxed).toBe(true);
  });
});

describe("selectTopic — cross-type same-day category exclusion (section 7.4)", () => {
  it("avoids a category already used by another type today, when alternatives exist", () => {
    const result = selectTopic(POOL, "seed", {
      recentHistory: [],
      today: "2026-10-23",
      categoriesUsedTodayElsewhere: ["cat1", "cat2"],
    });
    expect(result.item.category).toBe("cat3");
    expect(result.relaxed).toBe(false);
  });

  it("relaxes the cross-type exclusion before falling back to full history ignore", () => {
    // Every category is "used elsewhere" AND "e" (cat3) is also recently
    // used by this type — strict filter is empty, so it should relax
    // category-exclusion first and still respect the id exclusion.
    const result = selectTopic(POOL, "seed", {
      recentHistory: [{ id: "e", category: "cat3", date: "2026-10-23" }],
      today: "2026-10-23",
      categoriesUsedTodayElsewhere: ["cat1", "cat2", "cat3"],
    });
    expect(result.item.id).not.toBe("e");
    expect(result.relaxed).toBe(true);
  });
});

describe("selectTopic — error handling", () => {
  it("throws on an empty pool (a real configuration error, not a diversity edge case)", () => {
    expect(() => selectTopic([], "seed", { recentHistory: [], today: "2026-10-23" })).toThrow();
  });
});
