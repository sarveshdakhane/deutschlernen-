import { put, get } from "@vercel/blob";

export type PronunciationClip = {
  sentenceId: number;
  text: string;
  audioUrl: string;
  translation?: string;
};

const blobAvailable = () =>
  !!process.env.BLOB_READ_WRITE_TOKEN ||
  !!process.env.BLOB_STORE_ID ||
  !!process.env.VERCEL_OIDC_TOKEN;

function slugifyWord(word: string): string {
  return encodeURIComponent(word.trim().toLowerCase());
}

export async function getCachedClips(word: string): Promise<PronunciationClip[] | null> {
  if (!blobAvailable()) return null;
  try {
    const result = await get(`pronounce-${slugifyWord(word)}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as PronunciationClip[];
  } catch {
    return null;
  }
}

export async function saveCachedClips(word: string, clips: PronunciationClip[]): Promise<void> {
  if (!blobAvailable()) return;
  try {
    await put(`pronounce-${slugifyWord(word)}.json`, JSON.stringify(clips), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error(`[blob] pronounce cache save failed for "${word}":`, err);
  }
}
