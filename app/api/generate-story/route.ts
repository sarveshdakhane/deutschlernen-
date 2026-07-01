import { NextResponse } from "next/server";
import { after } from "next/server";
import { put, del, get, list } from "@vercel/blob";
import { generateDailyReadings } from "@/lib/claude";
import { Story } from "@/lib/types";

export const maxDuration = 60;

const prefetchedDates = new Set<string>();

const blobAvailable = () => {
  const hasStatic = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasStoreId = !!process.env.BLOB_STORE_ID;
  const hasOidc = !!process.env.VERCEL_OIDC_TOKEN;
  console.log(`[blob] credentials — BLOB_READ_WRITE_TOKEN:${hasStatic} BLOB_STORE_ID:${hasStoreId} VERCEL_OIDC_TOKEN:${hasOidc}`);
  return hasStatic || hasStoreId || hasOidc;
};

async function readFromBlob(date: string): Promise<Story[] | null> {
  if (!blobAvailable()) {
    console.log(`[blob] readFromBlob(${date}) skipped — no credentials`);
    return null;
  }
  try {
    console.log(`[blob] get readings-${date}.json`);
    const result = await get(`readings-${date}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      console.log(`[blob] not found or empty for ${date}`);
      return null;
    }
    const text = await new Response(result.stream).text();
    const data = JSON.parse(text) as Story[];
    console.log(`[blob] hit — ${data.length} stories for ${date}`);
    return data;
  } catch (err) {
    console.error(`[blob] readFromBlob(${date}) error:`, err);
    return null;
  }
}

// Downloads each story's Pixabay imageUrl into private blob storage and
// replaces the URL with our own proxy path so images never expire.
async function persistImages(readings: Story[], date: string): Promise<Story[]> {
  if (!blobAvailable()) return readings;
  return Promise.all(
    readings.map(async (story) => {
      if (!story.imageUrl || !story.imageUrl.startsWith("http")) return story;
      try {
        const res = await fetch(story.imageUrl);
        if (!res.ok) {
          console.warn(`[image] fetch failed for ${story.slug}: ${res.status}`);
          return story;
        }
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const filename = `image-${date}-${story.slug}.jpg`;
        await put(filename, buffer, {
          access: "private",
          addRandomSuffix: false,
          contentType,
        });
        console.log(`[image] saved ${filename}`);
        return { ...story, imageUrl: `/api/image/${date}/${story.slug}` };
      } catch (err) {
        console.warn(`[image] could not cache image for ${story.slug}:`, err);
        return story; // keep original URL as fallback
      }
    })
  );
}

async function saveToBlob(date: string, readings: Story[]): Promise<void> {
  if (!blobAvailable()) {
    console.log(`[blob] saveToBlob(${date}) skipped — no credentials`);
    return;
  }
  try {
    console.log(`[blob] saving readings-${date}.json ...`);
    const result = await put(`readings-${date}.json`, JSON.stringify(readings), {
      access: "private",
      addRandomSuffix: false,
    });
    console.log(`[blob] saved OK — ${result.url}`);
  } catch (err) {
    console.error(`[blob] saveToBlob(${date}) error:`, err);
  }
}

async function cleanupIfNeeded(): Promise<void> {
  if (!blobAvailable()) return;
  try {
    const { blobs } = await list({ prefix: "readings-" });
    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
    const thresholdBytes = 400 * 1024 * 1024;
    console.log(`[cleanup] total blob storage: ${(totalBytes / 1024 / 1024).toFixed(2)}MB`);
    if (totalBytes <= thresholdBytes) return;

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
      console.log(`[cleanup] deleted ${toDelete.length} blob(s)`);
    }
  } catch (err) {
    console.error("[cleanup] error:", err);
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
  const today = new Date().toISOString().split("T")[0];
  console.log(`[route] GET /api/generate-story — force:${force} date:${today}`);

  try {
    let readings: Story[] | null = force ? null : await readFromBlob(today);

    if (!readings) {
      console.log(`[route] blob miss — generating readings for ${today}`);
      readings = await generateDailyReadings(today);
      console.log(`[route] generation done — ${readings.length} stories`);
      readings = await persistImages(readings, today);
      await saveToBlob(today, readings);
    } else {
      console.log(`[route] blob hit — serving cached readings for ${today}`);
    }

    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        console.log(`[prefetch] checking tomorrow ${tomorrow}`);
        try {
          const existing = await readFromBlob(tomorrow);
          if (!existing) {
            console.log(`[prefetch] generating tomorrow ${tomorrow}`);
            let tomorrowReadings = await generateDailyReadings(tomorrow);
            tomorrowReadings = await persistImages(tomorrowReadings, tomorrow);
            await saveToBlob(tomorrow, tomorrowReadings);
            console.log(`[prefetch] done for ${tomorrow}`);
          } else {
            console.log(`[prefetch] tomorrow ${tomorrow} already cached`);
          }
          await cleanupIfNeeded();
        } catch (err) {
          console.error("[prefetch] error:", err);
        }
      });
    }

    const ttl = secondsUntilMidnight();
    return NextResponse.json(readings, {
      headers: force
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=30` },
    });
  } catch (error) {
    console.error("[route] fatal error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
