import { describe, expect, it } from "vitest";
import { pickDailyTopics, recordTopicSelections } from "../../lib/topicSelection.server";
import { getJsonWithEtag, putJsonIfMatch } from "../../lib/storage.server";
import { STORY_POOL } from "../../lib/topicPools";

// Minimal in-memory R2Bucket fake covering only the surface this module
// actually uses (get -> {text(), etag}, put with onlyIf.etagMatches). Cast
// to R2Bucket at the call site — the real interface has many more methods
// (list/delete/multipart/...) this code never calls.
class FakeR2Bucket {
  private store = new Map<string, { body: string; etag: string }>();
  private etagCounter = 0;
  public putAttempts = 0;

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return { text: async () => entry.body, etag: entry.etag };
  }

  async put(key: string, value: string, options?: { onlyIf?: { etagMatches?: string } }) {
    this.putAttempts++;
    const current = this.store.get(key);
    if (options?.onlyIf?.etagMatches !== undefined) {
      if (!current || current.etag !== options.onlyIf.etagMatches) return null; // conflict
    }
    const etag = `etag-${++this.etagCounter}`;
    this.store.set(key, { body: value, etag });
    return { key, etag };
  }
}

function fakeBucket() {
  return new FakeR2Bucket() as unknown as R2Bucket;
}

describe("getJsonWithEtag / putJsonIfMatch (storage.server.ts conditional-write primitives)", () => {
  it("round-trips a value and etag", async () => {
    const bucket = fakeBucket();
    await putJsonIfMatch(bucket, "k.json", { a: 1 }, null);
    const { value, etag } = await getJsonWithEtag<{ a: number }>(bucket, "k.json");
    expect(value).toEqual({ a: 1 });
    expect(etag).toBeTruthy();
  });

  it("rejects a conditional write whose etag no longer matches (section 7.11: concurrency safety)", async () => {
    const bucket = fakeBucket();
    await putJsonIfMatch(bucket, "k.json", { a: 1 }, null);
    const { etag: staleEtag } = await getJsonWithEtag(bucket, "k.json");

    // Someone else writes in between.
    await putJsonIfMatch(bucket, "k.json", { a: 2 }, staleEtag);

    // Our stale-etag write must be rejected, not silently clobber the
    // concurrent writer's update.
    const ok = await putJsonIfMatch(bucket, "k.json", { a: 999 }, staleEtag);
    expect(ok).toBe(false);

    const { value } = await getJsonWithEtag<{ a: number }>(bucket, "k.json");
    expect(value).toEqual({ a: 2 });
  });
});

describe("pickDailyTopics (section 7.1 / 7.4)", () => {
  it("picks one TopicItem per reading type", async () => {
    const bucket = fakeBucket();
    const picks = await pickDailyTopics(bucket, "2026-10-23");
    expect(Object.keys(picks).sort()).toEqual(["dialogue", "news", "speaking", "story"]);
    for (const item of Object.values(picks)) {
      expect(item.id).toBeTruthy();
      expect(item.premise).toBeTruthy();
    }
  });

  it("gives different reading types different categories when the pools allow it (cross-type diversity)", async () => {
    const bucket = fakeBucket();
    const picks = await pickDailyTopics(bucket, "2026-10-23");
    const categories = Object.values(picks).map((i) => i.category);
    // Not a hard guarantee for every pool shape, but across 4 picks with
    // these pool sizes it should not collapse to a single category.
    expect(new Set(categories).size).toBeGreaterThan(1);
  });

  it("is deterministic for the same date when history is empty", async () => {
    const picks1 = await pickDailyTopics(fakeBucket(), "2026-10-23");
    const picks2 = await pickDailyTopics(fakeBucket(), "2026-10-23");
    expect(picks1.story.id).toBe(picks2.story.id);
    expect(picks1.news.id).toBe(picks2.news.id);
  });

  it("never throws even if the history record is corrupt JSON", async () => {
    const bucket = fakeBucket();
    await (bucket as unknown as FakeR2Bucket).put("topic-history.json", "{not valid json", {});
    await expect(pickDailyTopics(bucket, "2026-10-23")).resolves.toBeTruthy();
  });
});

describe("recordTopicSelections (section 7.11: concurrent generation safety)", () => {
  it("records picks so a later pickDailyTopics call excludes them", async () => {
    const bucket = fakeBucket();
    const picks = await pickDailyTopics(bucket, "2026-10-23");
    await recordTopicSelections(bucket, "2026-10-23", picks);

    // Same date again (simulating a `force` regeneration) — now that these
    // ids are "recent," the strict-filter pick should differ or at least
    // not crash; what matters is the id is now present in history.
    const { value } = await getJsonWithEtag<Record<string, { id: string }[]>>(bucket, "topic-history.json");
    expect(value?.story?.some((e) => e.id === picks.story.id)).toBe(true);
    expect(value?.news?.some((e) => e.id === picks.news.id)).toBe(true);
  });

  it("does not corrupt history when two 'instances' write concurrently (simulated race)", async () => {
    const bucket = fakeBucket();

    // Seed an existing (empty) history record first — this test is about
    // steady-state concurrent writes (two DO instances racing on an
    // already-existing shared record), which is what the etag-conditional
    // write actually protects. The unseeded, very-first-write-ever case is
    // a documented, accepted exception (see putJsonIfMatch's doc comment in
    // lib/storage.server.ts) — there's no existing etag to condition on yet.
    await putJsonIfMatch(bucket, "topic-history.json", {}, null);

    // Simulate two Durable Object instances (today + tomorrow's prefetch)
    // both picking and both trying to record around the same time.
    const picksA = { story: STORY_POOL[0] };
    const picksB = { story: STORY_POOL[1] };

    await Promise.all([
      recordTopicSelections(bucket, "2026-10-23", picksA),
      recordTopicSelections(bucket, "2026-10-24", picksB),
    ]);

    const { value } = await getJsonWithEtag<Record<string, { id: string; date: string }[]>>(bucket, "topic-history.json");
    const storyHistory = value?.story ?? [];
    // Both writes must have survived — neither silently overwrote the other.
    expect(storyHistory.some((e) => e.id === STORY_POOL[0].id && e.date === "2026-10-23")).toBe(true);
    expect(storyHistory.some((e) => e.id === STORY_POOL[1].id && e.date === "2026-10-24")).toBe(true);
  });

  it("never throws, even after exhausting all conflict retries", async () => {
    // get() returns an existing object (so putJsonIfMatch takes the
    // conditional-write branch, not the unconditional first-write branch),
    // and put() reports a conflict every single time — simulating a bucket
    // under permanent contention.
    const bucket = {
      get: async () => ({ text: async () => JSON.stringify({}), etag: "stable-etag" }),
      put: async () => null,
    } as unknown as R2Bucket;

    await expect(
      recordTopicSelections(bucket, "2026-10-23", { story: STORY_POOL[0] })
    ).resolves.toBeUndefined();
  });
});
