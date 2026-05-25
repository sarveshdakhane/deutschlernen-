import { NextResponse } from "next/server";
import { generateDailyReadings } from "@/lib/claude";
import { getTodayReadings, writeCache } from "@/lib/readingsCache.server";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  const cached = !force && getTodayReadings();
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const readings = await generateDailyReadings();
    try { writeCache(readings); } catch { /* cache write failed — serve anyway */ }
    return NextResponse.json(readings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
