import { NextResponse } from "next/server";
import { after } from "next/server";
import { generateDailyReadings } from "@/lib/claude";
import { unstable_cache } from "next/cache";

export const maxDuration = 60;

const prefetchedDates = new Set<string>();

// Used only for tomorrow's prefetch — not for serving today's response.
function getCachedReadings(date: string) {
  return unstable_cache(
    () => generateDailyReadings(date),
    [`daily-readings-${date}`],
    { revalidate: 86400 }
  );
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Seconds remaining until midnight — used as the CDN cache TTL so the cache
// expires exactly when the day changes and fresh content is needed.
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
    const readings = await generateDailyReadings(today);

    // After sending today's response, pre-generate tomorrow in background.
    // Only fires once per serverless instance (prefetchedDates guard) and only
    // on CDN misses — when the CDN serves the cached response the function
    // isn't invoked at all, so after() never runs for cached requests.
    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        try {
          await getCachedReadings(tomorrow)();
          console.log(`[prefetch] Pre-generated tomorrow's readings: ${tomorrow}`);
        } catch (err) {
          console.error("[prefetch] Failed to pre-generate tomorrow's readings:", err);
        }
      });
    }

    // Cache the response at Vercel's CDN edge until midnight.
    // All devices and browsers share this one cached response — the serverless
    // function is not invoked again until the CDN TTL expires.
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
