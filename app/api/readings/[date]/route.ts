import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { ensureAudioCached, voiceForReadingType } from "@/lib/audioCache.server";
import { Story } from "@/lib/types";

// Generation now runs generate -> review -> analyze sequentially per reading
// type (see lib/claude.ts), roughly 3x the OpenAI round trips of before, even
// though the 4 reading types still run in parallel with each other. Raised
// from 60s accordingly. NOTE: Vercel Hobby plans cap function duration at
// 60s regardless of this setting — confirm your plan tier supports 120s
// before relying on it.
export const maxDuration = 120;

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

    // Backfill audioUrl/audioTimingsUrl (and voice-aware URLs) on readings cached
    // before those fields shipped — no new OpenAI text call needed, just re-derive
    // the proxy URLs from the already-stored text.
    if (
      Array.isArray(data) &&
      data.some((r) => !r.audioUrl || !r.audioTimingsUrl || !r.audioUrl.includes("voice="))
    ) {
      data = data.map((story) => {
        const slug = encodeURIComponent(story.slug);
        const voice = voiceForReadingType(story.readingType);
        return {
          ...story,
          audioUrl: `/api/audio/${date}/${slug}?t=${encodeURIComponent(story.story)}&voice=${voice}`,
          audioTimingsUrl: `/api/audio-timings/${date}/${slug}?voice=${voice}`,
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
      data.map((story) =>
        ensureAudioCached(date, story.slug, story.story, voiceForReadingType(story.readingType))
      )
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
