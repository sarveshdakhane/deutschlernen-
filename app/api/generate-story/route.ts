import { NextResponse } from "next/server";
import { after } from "next/server";
import { generateDailyReadings } from "@/lib/claude";
import { unstable_cache } from "next/cache";

export const maxDuration = 60;

// Tracks which dates have already had tomorrow's prefetch triggered in this
// serverless instance — prevents firing on every request.
const prefetchedDates = new Set<string>();

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

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const today = new Date().toISOString().split("T")[0];

    const readings = force
      ? await generateDailyReadings(today)
      : await getCachedReadings(today)();

    // Only schedule the prefetch once per serverless instance per day.
    // unstable_cache ensures actual generation only happens once across all instances.
    if (!prefetchedDates.has(today)) {
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

    return NextResponse.json(readings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
