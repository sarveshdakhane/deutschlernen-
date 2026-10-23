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
