import { NextResponse } from "next/server";
import { generateDailyReadings } from "@/lib/claude";
import { unstable_cache } from "next/cache";

export const maxDuration = 60;

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    let readings;

    if (force) {
      readings = await generateDailyReadings();
    } else {
      const today = new Date().toISOString().split("T")[0];
      const getCached = unstable_cache(
        () => generateDailyReadings(),
        [`daily-readings-${today}`],
        { revalidate: 86400 }
      );
      readings = await getCached();
    }

    return NextResponse.json(readings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
