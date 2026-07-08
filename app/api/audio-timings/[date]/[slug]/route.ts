import {
  audioFilename,
  timingsFilename,
  getCachedAudio,
  getCachedTimings,
  transcribeWordTimings,
  cacheTimings,
} from "@/lib/audioCache.server";

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  const decodedSlug = decodeURIComponent(slug);
  const timingsFile = timingsFilename(date, decodedSlug);

  const cached = await getCachedTimings(timingsFile);
  if (cached) {
    return Response.json(cached, {
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    });
  }

  // Fallback: audio should already be pre-generated — transcribe it now if the
  // timings step hasn't caught up yet.
  const audioFile = audioFilename(date, decodedSlug);
  const cachedAudio = await getCachedAudio(audioFile);
  if (!cachedAudio) {
    return new Response(null, { status: 404 });
  }

  const buffer = await new Response(cachedAudio.stream).arrayBuffer();
  const timings = await transcribeWordTimings(buffer);
  if (!timings) {
    return new Response(null, { status: 404 });
  }

  await cacheTimings(timingsFile, timings);
  return Response.json(timings, {
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
