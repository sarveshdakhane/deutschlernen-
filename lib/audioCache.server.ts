import { get, put } from "@vercel/blob";
import OpenAI, { toFile } from "openai";
import { WordTiming } from "./types";

// TTS input cap — daily readings are 300-480 words (~2-3k chars), well under this.
const MAX_INPUT_CHARS = 4000;

export const audioBlobAvailable = () =>
  !!process.env.BLOB_READ_WRITE_TOKEN ||
  !!process.env.BLOB_STORE_ID ||
  !!process.env.VERCEL_OIDC_TOKEN;

export function audioFilename(date: string, slug: string): string {
  return `audio-${date}-${slug}.mp3`;
}

export function timingsFilename(date: string, slug: string): string {
  return `audio-${date}-${slug}-timings.json`;
}

export async function getCachedAudio(
  filename: string
): Promise<{ stream: ReadableStream; contentType: string } | null> {
  if (!audioBlobAvailable()) return null;
  try {
    const result = await get(filename, { access: "private" });
    if (result?.statusCode === 200 && result.stream) {
      return { stream: result.stream, contentType: result.blob.contentType ?? "audio/mpeg" };
    }
  } catch {
    // not cached yet
  }
  return null;
}

async function getCachedAudioBuffer(filename: string): Promise<ArrayBuffer | null> {
  const cached = await getCachedAudio(filename);
  if (!cached) return null;
  const bytes = await new Response(cached.stream).arrayBuffer();
  return bytes;
}

export async function getCachedTimings(filename: string): Promise<WordTiming[] | null> {
  if (!audioBlobAvailable()) return null;
  try {
    const result = await get(filename, { access: "private" });
    if (result?.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as WordTiming[];
    }
  } catch {
    // not cached yet
  }
  return null;
}

export async function synthesizeAudio(text: string): Promise<ArrayBuffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new OpenAI({ apiKey });
    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text.slice(0, MAX_INPUT_CHARS),
      response_format: "mp3",
    });
    return await speech.arrayBuffer();
  } catch (err) {
    console.error("[audio] synthesis failed:", err);
    return null;
  }
}

// Re-transcribes the generated audio to recover per-word start/end times —
// OpenAI's TTS API doesn't return timing, only Whisper transcription does.
export async function transcribeWordTimings(buffer: ArrayBuffer): Promise<WordTiming[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new OpenAI({ apiKey });
    const file = await toFile(Buffer.from(buffer), "audio.mp3", { type: "audio/mpeg" });
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });
    const words = transcription.words;
    return words?.length ? words : null;
  } catch (err) {
    console.error("[audio] word-timing transcription failed:", err);
    return null;
  }
}

export async function cacheAudio(filename: string, buffer: ArrayBuffer): Promise<void> {
  if (!audioBlobAvailable()) return;
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

export async function cacheTimings(filename: string, timings: WordTiming[]): Promise<void> {
  if (!audioBlobAvailable()) return;
  try {
    await put(filename, JSON.stringify(timings), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch (err) {
    console.error(`[blob] timings cache save failed for ${filename}:`, err);
  }
}

// Pre-generates and caches audio + word timings for a reading if not already cached.
// Safe to call speculatively — no-ops for whatever's already cached or when TTS is unavailable.
export async function ensureAudioCached(date: string, slug: string, text: string): Promise<void> {
  const audioFile = audioFilename(date, slug);
  const timingsFile = timingsFilename(date, slug);

  let buffer = await getCachedAudioBuffer(audioFile);
  if (!buffer) {
    buffer = await synthesizeAudio(text);
    if (!buffer) return;
    await cacheAudio(audioFile, buffer);
  }

  const existingTimings = await getCachedTimings(timingsFile);
  if (existingTimings) return;

  const timings = await transcribeWordTimings(buffer);
  if (timings) await cacheTimings(timingsFile, timings);
}
