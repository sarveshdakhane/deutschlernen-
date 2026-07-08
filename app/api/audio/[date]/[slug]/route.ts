import { get, put } from "@vercel/blob";
import OpenAI from "openai";

export const maxDuration = 30;

// TTS input cap — daily readings are 300-480 words (~2-3k chars), well under this.
const MAX_INPUT_CHARS = 4000;

const blobAvailable = () =>
  !!process.env.BLOB_READ_WRITE_TOKEN ||
  !!process.env.BLOB_STORE_ID ||
  !!process.env.VERCEL_OIDC_TOKEN;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;
  const text = new URL(request.url).searchParams.get("t");

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  const filename = `audio-${date}-${decodeURIComponent(slug)}.mp3`;

  // Serve from blob if already cached
  if (blobAvailable()) {
    try {
      const cached = await get(filename, { access: "private" });
      if (cached?.statusCode === 200 && cached.stream) {
        return new Response(cached.stream, {
          headers: {
            "Content-Type": cached.blob.contentType ?? "audio/mpeg",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
    } catch {
      // not cached yet — synthesize with OpenAI TTS
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!text || !apiKey) {
    return new Response(null, { status: 404 });
  }

  let buffer: ArrayBuffer;
  try {
    const client = new OpenAI({ apiKey });
    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text.slice(0, MAX_INPUT_CHARS),
      response_format: "mp3",
    });
    buffer = await speech.arrayBuffer();
  } catch (err) {
    console.error(`[audio] TTS generation failed for ${filename}:`, err);
    return new Response(null, { status: 500 });
  }

  if (blobAvailable()) {
    try {
      await put(filename, buffer, {
        access: "private",
        addRandomSuffix: false,
        contentType: "audio/mpeg",
      });
    } catch (err) {
      console.error(`[blob] audio cache save failed for ${filename}:`, err);
    }
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
