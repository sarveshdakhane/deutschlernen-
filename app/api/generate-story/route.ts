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
  if (!blobAvailable()) return null;
  try {
    const result = await get(`readings-${date}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    const data = JSON.parse(text) as Story[];
    console.log(`[blob] hit — ${data.length} stories for ${date}`);
    return data;
  } catch (err) {
    console.error(`[blob] readFromBlob(${date}) error:`, err);
    return null;
  }
}

// Instead of downloading images at generation time (Pixabay blocks server-side
// hotlink fetches), we store the imageKeyword in the URL so the image proxy
// can call the Pixabay API fresh on the first browser request and cache the
// result in blob. No expiring URLs stored anywhere.
function assignProxyImageUrls(readings: Story[], date: string): Story[] {
  return readings.map((story) => {
    const keyword = story.imageKeyword;
    if (!keyword) return story;
    const proxyUrl = `/api/image/${date}/${encodeURIComponent(story.slug)}?kw=${encodeURIComponent(keyword)}`;
    return { ...story, imageUrl: proxyUrl };
  });
}

async function saveToBlob(date: string, readings: Story[]): Promise<string | null> {
  if (!blobAvailable()) {
    console.warn(`[blob] saveToBlob(${date}) skipped — no credentials`);
    return "no credentials";
  }
  try {
    const body = JSON.stringify(readings);
    console.log(`[blob] putting readings-${date}.json (${body.length} bytes) access:private`);
    const result = await put(`readings-${date}.json`, body, {
      access: "private",
      addRandomSuffix: false,
    });
    console.log(`[blob] saved OK — ${result.url}`);
    return null; // null = success
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[blob] saveToBlob(${date}) FAILED: ${msg}`);
    return msg; // return error message
  }
}

async function cleanupIfNeeded(): Promise<void> {
  if (!blobAvailable()) return;
  try {
    const { blobs } = await list({ prefix: "readings-" });
    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
    const thresholdBytes = 400 * 1024 * 1024;
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

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  const today = new Date().toISOString().split("T")[0];
  console.log(`[route] GET /api/generate-story — force:${force} date:${today}`);

  try {
    let readings: Story[] | null = force ? null : await readFromBlob(today);

    let saveError: string | null = null;
    if (!readings) {
      console.log(`[route] generating readings for ${today}`);
      readings = await generateDailyReadings(today);
      readings = assignProxyImageUrls(readings, today);
      saveError = await saveToBlob(today, readings);
      console.log(`[route] generation done — ${readings.length} stories, saveError=${saveError}`);
    }

    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        try {
          const existing = await readFromBlob(tomorrow);
          if (!existing) {
            console.log(`[prefetch] generating tomorrow ${tomorrow}`);
            let tomorrowReadings = await generateDailyReadings(tomorrow);
            tomorrowReadings = assignProxyImageUrls(tomorrowReadings, tomorrow);
            const err = await saveToBlob(tomorrow, tomorrowReadings);
            if (err) console.error(`[prefetch] save failed for ${tomorrow}: ${err}`);
            console.log(`[prefetch] done for ${tomorrow}`);
          }
          await cleanupIfNeeded();
        } catch (err) {
          console.error("[prefetch] error:", err);
        }
      });
    }

    // In force mode, wrap response to expose save status for debugging
    if (force) {
      return NextResponse.json(
        { saveError, stories: readings },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(readings, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[route] fatal error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
