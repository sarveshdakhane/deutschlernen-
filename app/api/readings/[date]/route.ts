import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { ensureAudioCached } from "@/lib/audioCache.server";
import { Story } from "@/lib/types";

export const maxDuration = 60;

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

    // Backfill audioUrl/audioTimingsUrl on readings cached before those fields
    // shipped — no new OpenAI text call needed, just re-derive the proxy URLs.
    if (Array.isArray(data) && data.some((r) => !r.audioUrl || !r.audioTimingsUrl)) {
      data = data.map((story) => {
        const slug = encodeURIComponent(story.slug);
        return {
          ...story,
          audioUrl: `/api/audio/${date}/${slug}?t=${encodeURIComponent(story.story)}`,
          audioTimingsUrl: `/api/audio-timings/${date}/${slug}`,
        };
      });
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

    await Promise.allSettled(
      data.map((story) => ensureAudioCached(date, story.slug, story.story))
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
