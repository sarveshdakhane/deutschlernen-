import { NextResponse } from "next/server";
import { generateDailyReadings } from "@/lib/claude";

export async function GET() {
  try {
    const readings = await generateDailyReadings();
    return NextResponse.json(readings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
