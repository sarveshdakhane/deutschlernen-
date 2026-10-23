import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getJson } from "@/lib/storage.server";
import { Story } from "@/lib/types";

// Generation runs generate -> review -> analyze sequentially per reading
// type (see lib/claude.ts), several Claude round trips, even though the 4
// reading types still run in parallel with each other. Raised from 60s
// accordingly.
export const maxDuration = 120;

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { env } = getCloudflareContext();

  try {
    const data = await getJson<Story[]>(env.CONTENT_BUCKET, `readings-${date}.json`);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
