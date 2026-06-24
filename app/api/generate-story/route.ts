import { NextResponse } from "next/server";
import { after } from "next/server";
import { list, put, del } from "@vercel/blob";
import { generateDailyReadings } from "@/lib/claude";
import { Story } from "@/lib/types";

export const maxDuration = 60;

// In-process guard so the prefetch after() only fires once per instance per day.
const prefetchedDates = new Set<string>();

const blobAvailable = () => {
  const ok =
    !!process.env.BLOB_READ_WRITE_TOKEN ||   // static token
    !!process.env.BLOB_STORE_ID ||            // OIDC via store ID
    !!process.env.VERCEL_OIDC_TOKEN;          // OIDC token directly
  if (!ok) console.warn("[blob] No blob credentials found — blob storage disabled");
  return ok;
};

async function readFromBlob(date: string): Promise<Story[] | null> {
  if (!blobAvailable()) return null;
  try {
    const { blobs } = await list({ prefix: `readings-${date}` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function saveToBlob(date: string, readings: Story[]): Promise<void> {
  if (!blobAvailable()) return;
  await put(`readings-${date}.json`, JSON.stringify(readings), {
    access: "public",
    addRandomSuffix: false,
  });
}

// Deletes oldest blobs when total storage exceeds 400MB to stay within free tier.
async function cleanupIfNeeded(): Promise<void> {
  if (!blobAvailable()) return;
  const { blobs } = await list({ prefix: "readings-" });
  const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
  const thresholdBytes = 400 * 1024 * 1024; // 400MB

  if (totalBytes <= thresholdBytes) return;

  // Sort oldest first, delete until back under 300MB
  const sorted = [...blobs].sort((a, b) => a.pathname.localeCompare(b.pathname));
  const targetBytes = 300 * 1024 * 1024;
  const toDelete: string[] = [];
  let remaining = totalBytes;

  for (const blob of sorted) {
    if (remaining <= targetBytes) break;
    toDelete.push(blob.url);
    remaining -= blob.size;
  }

  if (toDelete.length > 0) {
    await del(toDelete);
    console.log(`[cleanup] Deleted ${toDelete.length} old blob(s), freed ${((totalBytes - remaining) / 1024 / 1024).toFixed(1)}MB`);
  }
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Try blob first (shared across all regions and instances)
    let readings: Story[] | null = force ? null : await readFromBlob(today);

    // 2. Blob miss — generate and persist so every subsequent request hits blob
    if (!readings) {
      readings = await generateDailyReadings(today);
      try {
        await saveToBlob(today, readings);
      } catch {
        // No BLOB_READ_WRITE_TOKEN in local dev — safe to ignore
      }
    }

    // 3. After the response is sent, pre-generate tomorrow if not already done
    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        try {
          const existing = await readFromBlob(tomorrow);
          if (!existing) {
            const tomorrowReadings = await generateDailyReadings(tomorrow);
            await saveToBlob(tomorrow, tomorrowReadings);
            console.log(`[prefetch] Pre-generated tomorrow's readings: ${tomorrow}`);
          }
          await cleanupIfNeeded();
        } catch (err) {
          console.error("[prefetch] Failed:", err);
        }
      });
    }

    // 4. CDN edge cache as a fast layer in front of blob
    const ttl = secondsUntilMidnight();
    return NextResponse.json(readings, {
      headers: force
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=30` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
