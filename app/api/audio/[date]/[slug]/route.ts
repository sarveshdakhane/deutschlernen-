import {
  audioFilename,
  getCachedAudioBuffer,
  synthesizeAudio,
  cacheAudio,
  DEFAULT_VOICE,
} from "@/lib/audioCache.server";

export const maxDuration = 30;

function parseRange(rangeHeader: string | null, totalLength: number): { start: number; end: number } | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return null;

  const start = startStr ? parseInt(startStr, 10) : 0;
  const end = endStr ? Math.min(parseInt(endStr, 10), totalLength - 1) : totalLength - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || start >= totalLength) return null;
  return { start, end };
}

// Serves the mp3 with Content-Length and Range support — without these,
// browsers (Safari/iOS in particular) can silently stop playback partway
// through, and seeking to an unbuffered position doesn't work at all.
function buildAudioResponse(buffer: ArrayBuffer, rangeHeader: string | null): Response {
  const totalLength = buffer.byteLength;
  const range = parseRange(rangeHeader, totalLength);

  if (!range) {
    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(totalLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  }

  const { start, end } = range;
  const chunk = buffer.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;
  const searchParams = new URL(request.url).searchParams;
  const text = searchParams.get("t");
  const voice = searchParams.get("voice") ?? DEFAULT_VOICE;
  const rangeHeader = request.headers.get("range");

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  const filename = audioFilename(date, decodeURIComponent(slug), voice);

  // Serve from blob if already cached (typically pre-generated ahead of time)
  const cached = await getCachedAudioBuffer(filename);
  if (cached) {
    return buildAudioResponse(cached, rangeHeader);
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

  return buildAudioResponse(buffer, rangeHeader);
}
