import { getJson, putJson } from "./storage.server";
import { selectVocabularyWords } from "./vocabSelection";
import { fetchVocabularyCategories } from "./notion.server";

const COOLDOWN_KEY = "notion-vocab-usage.json";

// How many words to try to work into a single reading. Kept small —
// NATURAL_GERMAN_RULES already pushes back against forcing too much in,
// and buildVocabularyTargetInstruction's exception to that rule should stay
// a light touch, not the dominant constraint on the generated text.
export const WORDS_PER_READING = 5;

// Picks words to target for one reading, pulling from the Vocab page's
// "1. Vocabulary & Expressions" section and skipping anything still in its
// cooldown window (see lib/vocabSelection.ts). Returns [] — never throws —
// if Notion isn't configured or the page can't be parsed; callers treat
// vocabulary targeting as optional enrichment, not a requirement.
export async function pickVocabularyForReading(bucket: R2Bucket): Promise<string[]> {
  const categories = await fetchVocabularyCategories();
  if (!categories || Object.keys(categories).length === 0) return [];

  const usedAt = (await getJson<Record<string, string>>(bucket, COOLDOWN_KEY)) ?? {};
  return selectVocabularyWords(categories, usedAt, WORDS_PER_READING);
}

// Records that these words were just worked into a reading, so they're
// skipped (per selectVocabularyWords' cooldown) for a while. Call only
// after generation actually succeeds — see pickVocabularyForReading's
// caller in lib/claude.ts.
export async function recordVocabularyUsed(bucket: R2Bucket, words: string[]): Promise<void> {
  if (words.length === 0) return;
  try {
    const usedAt = (await getJson<Record<string, string>>(bucket, COOLDOWN_KEY)) ?? {};
    const now = new Date().toISOString();
    for (const word of words) usedAt[word.toLowerCase()] = now;
    await putJson(bucket, COOLDOWN_KEY, usedAt);
  } catch (err) {
    console.error("[vocab-cooldown] failed to record usage:", err);
  }
}
