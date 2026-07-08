import { NextResponse } from "next/server";
import { after } from "next/server";
import { put, del, get, list } from "@vercel/blob";
import { generateDailyReadings } from "@/lib/claude";
import { Story } from "@/lib/types";

export const maxDuration = 60;

const prefetchedDates = new Set<string>();

const blobAvailable = () =>
  !!process.env.BLOB_READ_WRITE_TOKEN ||
  !!process.env.BLOB_STORE_ID ||
  !!process.env.VERCEL_OIDC_TOKEN;

async function readFromBlob(date: string): Promise<Story[] | null> {
  if (!blobAvailable()) return null;
  try {
    const result = await get(`readings-${date}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as Story[];
  } catch {
    return null;
  }
}

// Stores imageKeyword in the proxy URL so the image route can fetch from
// Pixabay on first request and cache in blob — no expiring CDN URLs stored.
function assignProxyImageUrls(readings: Story[], date: string): Story[] {
  return readings.map((story) => {
    if (!story.imageKeyword) return story;
    const proxyUrl = `/api/image/${date}/${encodeURIComponent(story.slug)}?kw=${encodeURIComponent(story.imageKeyword)}`;
    return { ...story, imageUrl: proxyUrl };
  });
}

// Stores the reading text in the proxy URL so the audio route can synthesize
// speech on first request and cache the mp3 in blob.
function assignProxyAudioUrls(readings: Story[], date: string): Story[] {
  return readings.map((story) => {
    const proxyUrl = `/api/audio/${date}/${encodeURIComponent(story.slug)}?t=${encodeURIComponent(story.story)}`;
    return { ...story, audioUrl: proxyUrl };
  });
}

async function saveToBlob(date: string, readings: Story[]): Promise<void> {
  if (!blobAvailable()) return;
  try {
    await put(`readings-${date}.json`, JSON.stringify(readings), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error(`[blob] save failed for ${date}:`, err);
  }
}

async function cleanupIfNeeded(): Promise<void> {
  if (!blobAvailable()) return;
  try {
    const { blobs } = await list({ prefix: "readings-" });
    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
    if (totalBytes <= 400 * 1024 * 1024) return;

    const sorted = [...blobs].sort((a, b) => a.pathname.localeCompare(b.pathname));
    const toDelete: string[] = [];
    let remaining = totalBytes;
    for (const blob of sorted) {
      if (remaining <= 300 * 1024 * 1024) break;
      toDelete.push(blob.url);
      remaining -= blob.size;
    }
    if (toDelete.length > 0) {
      await del(toDelete);
      console.log(`[cleanup] deleted ${toDelete.length} old blob(s)`);
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

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  const today = new Date().toISOString().split("T")[0];

  try {
    let readings: Story[] | null = force ? null : await readFromBlob(today);

    if (!readings) {
      readings = await generateDailyReadings(today);
      readings = assignProxyImageUrls(readings, today);
      readings = assignProxyAudioUrls(readings, today);
      await saveToBlob(today, readings);
    }

    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        try {
          const existing = await readFromBlob(tomorrow);
          if (!existing) {
            let tomorrowReadings = await generateDailyReadings(tomorrow);
            tomorrowReadings = assignProxyImageUrls(tomorrowReadings, tomorrow);
            tomorrowReadings = assignProxyAudioUrls(tomorrowReadings, tomorrow);
            await saveToBlob(tomorrow, tomorrowReadings);
          }
          await cleanupIfNeeded();
        } catch (err) {
          console.error("[prefetch] error:", err);
        }
      });
    }

    return NextResponse.json(readings, {
      headers: force
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[route] fatal error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
