import { audioFilename, getCachedAudio, synthesizeAudio, cacheAudio, DEFAULT_VOICE } from "@/lib/audioCache.server";

export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;
  const searchParams = new URL(request.url).searchParams;
  const text = searchParams.get("t");
  const voice = searchParams.get("voice") ?? DEFAULT_VOICE;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  const filename = audioFilename(date, decodeURIComponent(slug), voice);

  // Serve from blob if already cached (typically pre-generated ahead of time)
  const cached = await getCachedAudio(filename);
  if (cached) {
    return new Response(cached.stream, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  }

  // Fallback: synthesize on demand (e.g. pre-generation hasn't finished yet)
  if (!text) {
    return new Response(null, { status: 404 });
  }

  const buffer = await synthesizeAudio(text, voice);
  if (!buffer) {
    return new Response(null, { status: 500 });
  }

  await cacheAudio(filename, buffer);

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
