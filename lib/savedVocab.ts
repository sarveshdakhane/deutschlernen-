import { SavedVocabItem } from "./types";

export async function getSavedVocab(): Promise<SavedVocabItem[]> {
  try {
    const res = await fetch("/api/vocab");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function isVocabSaved(word: string): Promise<boolean> {
  const items = await getSavedVocab();
  return items.some((v) => v.word.toLowerCase() === word.toLowerCase());
}

export async function addToVocab(item: SavedVocabItem): Promise<void> {
  await fetch("/api/vocab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
}

export async function removeFromVocab(word: string): Promise<void> {
  await fetch("/api/vocab", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });
}
