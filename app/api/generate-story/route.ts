import { NextResponse } from "next/server";
import { generateDailyReadings } from "@/lib/claude";
import { getTodayReadings, writeCache } from "@/lib/readingsCache.server";

export async function GET() {
  const cached = getTodayReadings();
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const readings = await generateDailyReadings();
    writeCache(readings);
    return NextResponse.json(readings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
