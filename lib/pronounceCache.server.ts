import { getJson, putJson } from "./storage.server";

export type PronunciationClip = {
  sentenceId: number;
  text: string;
  audioUrl: string;
  translation?: string;
};

function slugifyWord(word: string): string {
  return encodeURIComponent(word.trim().toLowerCase());
}

export async function getCachedClips(bucket: R2Bucket, word: string): Promise<PronunciationClip[] | null> {
  return getJson<PronunciationClip[]>(bucket, `pronounce-${slugifyWord(word)}.json`);
}

export async function saveCachedClips(bucket: R2Bucket, word: string, clips: PronunciationClip[]): Promise<void> {
  try {
    await putJson(bucket, `pronounce-${slugifyWord(word)}.json`, clips);
  } catch (err) {
    console.error(`[storage] pronounce cache save failed for "${word}":`, err);
  }
}
