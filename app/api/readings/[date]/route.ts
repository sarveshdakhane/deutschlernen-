import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { Story } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const result = await get(`readings-${date}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const text = await new Response(result.stream).text();
    let data = JSON.parse(text) as Story[];

    // Backfill audioUrl on readings cached before the audio feature shipped —
    // no new OpenAI text call needed, just re-derive the proxy URL from existing text.
    if (Array.isArray(data) && data.some((r) => !r.audioUrl)) {
      data = data.map((story) => ({
        ...story,
        audioUrl: `/api/audio/${date}/${encodeURIComponent(story.slug)}?t=${encodeURIComponent(story.story)}`,
      }));
      try {
        await put(`readings-${date}.json`, JSON.stringify(data), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      } catch (err) {
        console.error(`[blob] audioUrl backfill save failed for ${date}:`, err);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
