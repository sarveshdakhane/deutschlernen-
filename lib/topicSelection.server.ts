// R2-backed glue between the pure selection algorithm (lib/topicSelection.ts)
// and the pure topic pools (lib/topicPools.ts). Mirrors the existing
// lib/vocabCooldown.server.ts pattern: pure algorithm + pure data in one
// place, R2 read/write isolated here.
//
// Concurrency note: generateDailyReadingsCore (lib/claude.ts) calls
// pickDailyTopics() ONCE per date, synchronously computing picks for all 4
// reading types in-memory before any generation starts — so the 4 types
// never race with each other over history (they're all in the same JS call,
// same Durable Object instance; see workers/generationCoordinator.ts, which
// already serializes all 4 types' generation under one DO per date+kind).
// The real race is BETWEEN two different dates' DO instances (e.g. today's
// on-demand request and tomorrow's cron prefetch) both touching the same
// shared history record around the same time — recordTopicSelections()
// handles that with an optimistic-concurrency retry loop.

import { ReadingType } from "./types";
import { TopicItem, getPoolForType } from "./topicPools";
import { selectTopic, TopicHistoryEntry } from "./topicSelection";
import { getJsonWithEtag, putJsonIfMatch } from "./storage.server";

const HISTORY_KEY = "topic-history.json";
// Within the 14-21 day range called for — long enough that a daily user
// won't consciously notice a repeat, short enough that small pools (e.g.
// 10-12 news items) don't get stuck permanently excluding everything.
const HISTORY_WINDOW_DAYS = 18;
const MAX_CONDITIONAL_WRITE_ATTEMPTS = 3;

type HistoryStore = Partial<Record<ReadingType, TopicHistoryEntry[]>>;

const READING_TYPES: ReadingType[] = ["news", "dialogue", "story", "speaking"];

function pruneOld(entries: TopicHistoryEntry[], today: string): TopicHistoryEntry[] {
  const msPerDay = 86400000;
  const todayDays = Math.floor(new Date(today).getTime() / msPerDay);
  return entries.filter((e) => {
    const entryDays = Math.floor(new Date(e.date).getTime() / msPerDay);
    return Number.isFinite(entryDays) && todayDays - entryDays <= HISTORY_WINDOW_DAYS;
  });
}

// Picks one TopicItem per reading type for `date`, considering each type's
// own recent-use history AND which categories the other 3 types already
// landed on earlier in this same call (cross-type same-day diversity).
// Never throws — on any storage error, falls back to selecting with empty
// history (still deterministic, just without the recency/cross-type bias)
// so a history-store hiccup can never block generation.
export async function pickDailyTopics(
  bucket: R2Bucket,
  date: string
): Promise<Record<ReadingType, TopicItem>> {
  let history: HistoryStore = {};
  try {
    const { value } = await getJsonWithEtag<HistoryStore>(bucket, HISTORY_KEY);
    history = value ?? {};
  } catch (err) {
    console.error("[topic-history] read failed, selecting without recency bias:", err);
  }

  const picks = {} as Record<ReadingType, TopicItem>;
  const categoriesUsedToday: string[] = [];

  for (const type of READING_TYPES) {
    const pool = getPoolForType(type);
    const recentHistory = history[type] ?? [];
    const seed = `${date}:${type}:v1`;
    const { item } = selectTopic(pool, seed, {
      recentHistory,
      today: date,
      windowDays: HISTORY_WINDOW_DAYS,
      categoriesUsedTodayElsewhere: categoriesUsedToday,
    });
    picks[type] = item;
    categoriesUsedToday.push(item.category);
  }

  return picks;
}

// Records today's picks into the shared history record. Call only after
// generation succeeds for a given type (same fail-soft convention as the
// Notion queue / vocabulary cooldown). Uses optimistic concurrency
// (etag-conditional write, bounded retries) since this record is shared
// across date-keyed Durable Object instances — see module doc comment.
// Never throws; a failure here only means slightly weaker diversity next
// time, never a broken generation.
export async function recordTopicSelections(
  bucket: R2Bucket,
  date: string,
  picks: Partial<Record<ReadingType, TopicItem>>
): Promise<void> {
  const entries = Object.entries(picks) as [ReadingType, TopicItem | undefined][];
  if (entries.length === 0) return;

  for (let attempt = 1; attempt <= MAX_CONDITIONAL_WRITE_ATTEMPTS; attempt++) {
    try {
      const { value, etag } = await getJsonWithEtag<HistoryStore>(bucket, HISTORY_KEY);
      const next: HistoryStore = { ...(value ?? {}) };

      for (const [type, item] of entries) {
        if (!item) continue;
        const existing = pruneOld(next[type] ?? [], date);
        next[type] = [...existing, { id: item.id, category: item.category, date }];
      }

      const ok = await putJsonIfMatch(bucket, HISTORY_KEY, next, etag);
      if (ok) return;
      // Conflict — another instance wrote in between. Re-read and retry.
    } catch (err) {
      console.error(`[topic-history] write attempt ${attempt} failed:`, err);
      return; // storage error, not a conflict — don't burn retries on it
    }
  }
  console.warn("[topic-history] gave up after concurrent write conflicts; today's picks won't be recorded");
}
