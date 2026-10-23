// Pure selection algorithm — no network/storage I/O, fully unit-testable
// with an injected history array and seed. lib/topicSelection.server.ts
// wires this up to the real R2-backed history record.
//
// Replaces the old `day-count % pool.length` rotation (100% predictable,
// repeats on a fixed short cycle) with a deterministic *seeded hash* pick
// combined with recent-use exclusion — still fully reproducible for a given
// (seed, history) pair (useful for debugging/tests), but not trivially
// guessable from the date alone the way day-count modulo was.

import { TopicItem } from "./topicPools";

export type TopicHistoryEntry = {
  id: string;
  category: string;
  date: string; // YYYY-MM-DD
};

// FNV-1a-style string hash — small, dependency-free, good-enough
// distribution for "pick an index," not a cryptographic requirement.
export function seededIndex(seed: string, modulus: number): number {
  if (modulus <= 0) return 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Force unsigned before modulus.
  return (hash >>> 0) % modulus;
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.abs(Math.floor(new Date(a).getTime() / msPerDay) - Math.floor(new Date(b).getTime() / msPerDay));
}

export type SelectTopicOptions = {
  // Recent picks for THIS reading type, oldest-or-newest order doesn't
  // matter — every entry within `windowDays` of `today` is excluded by id.
  recentHistory: TopicHistoryEntry[];
  // Today's date, YYYY-MM-DD.
  today: string;
  // How many days back counts as "recent" for id-level exclusion.
  windowDays?: number;
  // Categories already picked for OTHER reading types today — soft
  // exclusion, only applied if it doesn't empty the pool (see selectTopic).
  categoriesUsedTodayElsewhere?: string[];
};

export type SelectTopicResult = {
  item: TopicItem;
  // True if every exclusion filter had to be relaxed to find a pick
  // (pool otherwise would have been empty) — useful for logging/debugging,
  // never a failure condition.
  relaxed: boolean;
};

// Deterministically picks one item from `pool` for `seed` (typically
// `${date}:${type}`), preferring items that are:
//   1. not used (by id) within `windowDays` of `today` for this type, AND
//   2. not in a category already picked by another type today.
// Both filters relax independently (first #2, then #1, then none) rather
// than ever failing — a diversity feature should never be able to block
// generation. Picking itself is a seeded hash of `seed` over the filtered
// pool, so the same (seed, history) always reproduces the same pick.
export function selectTopic(pool: TopicItem[], seed: string, options: SelectTopicOptions): SelectTopicResult {
  if (pool.length === 0) throw new Error("selectTopic: pool is empty");

  const windowDays = options.windowDays ?? 18;
  const recentIds = new Set(
    options.recentHistory
      .filter((h) => daysBetween(h.date, options.today) <= windowDays)
      .map((h) => h.id)
  );
  const usedCategoriesToday = new Set(options.categoriesUsedTodayElsewhere ?? []);

  const strict = pool.filter((item) => !recentIds.has(item.id) && !usedCategoriesToday.has(item.category));
  if (strict.length > 0) {
    return { item: strict[seededIndex(seed, strict.length)], relaxed: false };
  }

  // Relax #2 (cross-type same-day category exclusion) first — it's the
  // softer constraint of the two.
  const idOnly = pool.filter((item) => !recentIds.has(item.id));
  if (idOnly.length > 0) {
    return { item: idOnly[seededIndex(seed, idOnly.length)], relaxed: true };
  }

  // Every item is "recent" (small pool / long history) — ignore history
  // entirely rather than fail. Still deterministic.
  return { item: pool[seededIndex(seed, pool.length)], relaxed: true };
}
