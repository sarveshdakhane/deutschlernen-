// Pure selection algorithm — no network/storage I/O, so fully unit-testable
// with an injected clock and RNG. lib/vocabCooldown.server.ts wires this up
// to the real Notion fetch and R2-backed cooldown record.

import { CategorizedVocabulary } from "./notionVocabParser";

const DEFAULT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Even the oldest word in a category still gets 30% of a brand-new word's
// selection weight — recency is a bias, not an exclusion. Per the user: the
// goal is broad practice across everything they've logged, not just a
// running window of the last few entries.
const MIN_RECENCY_WEIGHT = 0.3;

function weightedPickIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return Math.floor(random() * weights.length);
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isInCooldown(word: string, usedAt: Record<string, string>, now: Date, cooldownMs: number): boolean {
  const lastUsed = usedAt[word.toLowerCase()];
  if (!lastUsed) return false;
  const lastUsedTime = new Date(lastUsed).getTime();
  if (Number.isNaN(lastUsedTime)) return false;
  return now.getTime() - lastUsedTime < cooldownMs;
}

// Picks up to `count` words, biased toward the end of each category's list
// (most recently added) but never excluding older entries outright, and
// round-robins across categories so one large category (e.g. Verben) can't
// crowd out the smaller ones. Words used within `cooldownMs` are skipped
// entirely; if that empties every category, returns fewer than `count` (or
// none) rather than forcing repeats — callers treat this as optional
// enrichment, not a hard requirement.
export function selectVocabularyWords(
  categories: CategorizedVocabulary,
  usedAt: Record<string, string>,
  count: number,
  now: Date = new Date(),
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
  random: () => number = Math.random
): string[] {
  type Candidate = { word: string; weight: number };
  const pools: Record<string, Candidate[]> = {};

  for (const [category, words] of Object.entries(categories)) {
    const total = words.length;
    if (total === 0) continue;

    const available = words
      .map((word, i) => ({ word, i }))
      .filter(({ word }) => !isInCooldown(word, usedAt, now, cooldownMs))
      .map(({ word, i }) => ({
        word,
        weight: MIN_RECENCY_WEIGHT + (1 - MIN_RECENCY_WEIGHT) * ((i + 1) / total),
      }));

    if (available.length > 0) pools[category] = available;
  }

  let remainingCategories = shuffle(Object.keys(pools), random);
  const picked: string[] = [];

  while (picked.length < count && remainingCategories.length > 0) {
    for (const category of remainingCategories) {
      if (picked.length >= count) break;
      const pool = pools[category];
      const idx = weightedPickIndex(pool.map((c) => c.weight), random);
      const [chosen] = pool.splice(idx, 1);
      picked.push(chosen.word);
    }
    remainingCategories = remainingCategories.filter((c) => pools[c].length > 0);
  }

  return picked;
}
