import { getCloudflareContext } from "@opennextjs/cloudflare";

// R2-backed replacement for the old @vercel/blob cache. Every call site below
// matches the shape of the blob calls it replaced (same cache-key strings),
// so routes just swap which function they call. `getContentBucket()` is the
// Next.js-side accessor (goes through getCloudflareContext()); the Durable
// Object coordinator (workers/generationCoordinator.ts) already has its own
// `env.CONTENT_BUCKET` from its constructor and calls the bucket-first
// functions below directly, bypassing getCloudflareContext() entirely (that
// helper only works inside the Next.js/OpenNext request path).

export function getContentBucket(): R2Bucket {
  return getCloudflareContext().env.CONTENT_BUCKET;
}

export async function getText(bucket: R2Bucket, key: string): Promise<string | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return obj.text();
}

export async function getBinary(
  bucket: R2Bucket,
  key: string
): Promise<{ data: ArrayBuffer; contentType?: string } | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return { data: await obj.arrayBuffer(), contentType: obj.httpMetadata?.contentType };
}

export async function putText(
  bucket: R2Bucket,
  key: string,
  value: string,
  contentType = "application/json"
): Promise<void> {
  await bucket.put(key, value, { httpMetadata: { contentType } });
}

export async function putBinary(
  bucket: R2Bucket,
  key: string,
  value: ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, value, { httpMetadata: { contentType } });
}

export async function getJson<T>(bucket: R2Bucket, key: string): Promise<T | null> {
  const text = await getText(bucket, key);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function putJson(bucket: R2Bucket, key: string, value: unknown): Promise<void> {
  await putText(bucket, key, JSON.stringify(value), "application/json");
}

// Read-with-etag, for the optimistic-concurrency read-modify-write pattern
// below. `etag: null` means the object didn't exist at read time.
export async function getJsonWithEtag<T>(
  bucket: R2Bucket,
  key: string
): Promise<{ value: T | null; etag: string | null }> {
  const obj = await bucket.get(key);
  if (!obj) return { value: null, etag: null };
  try {
    return { value: JSON.parse(await obj.text()) as T, etag: obj.etag };
  } catch {
    return { value: null, etag: obj.etag };
  }
}

// Conditional write — succeeds only if the object's etag still matches what
// was read. Returns false on a conflict so the caller can re-read and
// retry, instead of silently clobbering a concurrent writer's update. Used
// by lib/topicSelection.server.ts, where two Durable Object instances (e.g.
// today's and tomorrow's prefetch) could otherwise race on the same shared
// topic-history record.
//
// `etag: null` (object didn't exist at read time) falls back to a plain
// unconditional put rather than a conditional "create-only" write — R2's
// onlyIf doesn't expose a confirmed "must not exist" primitive, and this
// path is a one-time bootstrap case (first-ever history write) where losing
// a single concurrent entry is an acceptable, self-healing edge case for a
// best-effort diversity feature, not correctness-critical data.
export async function putJsonIfMatch(
  bucket: R2Bucket,
  key: string,
  value: unknown,
  etag: string | null
): Promise<boolean> {
  const body = JSON.stringify(value);
  if (!etag) {
    await putText(bucket, key, body, "application/json");
    return true;
  }
  const result = await bucket.put(key, body, {
    httpMetadata: { contentType: "application/json" },
    onlyIf: { etagMatches: etag },
  });
  return result !== null;
}

export async function listKeys(
  bucket: R2Bucket,
  prefix: string
): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    out.push(...page.objects.map((o) => ({ key: o.key, size: o.size })));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function deleteKeys(bucket: R2Bucket, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await bucket.delete(keys);
}

// Prunes the oldest objects under `prefix` once total size exceeds
// `maxBytes`, stopping once it's back under `targetBytes`. Keys are sorted
// lexicographically, which for date-stamped keys (`readings-YYYY-MM-DD.json`)
// is also chronological, so this naturally deletes the oldest dates first.
export async function pruneByteBudget(
  bucket: R2Bucket,
  prefix: string,
  maxBytes: number,
  targetBytes: number
): Promise<string[]> {
  const objects = await listKeys(bucket, prefix);
  const totalBytes = objects.reduce((sum, o) => sum + o.size, 0);
  if (totalBytes <= maxBytes) return [];

  const sorted = [...objects].sort((a, b) => a.key.localeCompare(b.key));
  const toDelete: string[] = [];
  let remaining = totalBytes;
  for (const obj of sorted) {
    if (remaining <= targetBytes) break;
    toDelete.push(obj.key);
    remaining -= obj.size;
  }
  if (toDelete.length > 0) await deleteKeys(bucket, toDelete);
  return toDelete;
}
