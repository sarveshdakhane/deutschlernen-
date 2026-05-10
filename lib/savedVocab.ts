import { SavedVocabItem } from "./types";

const KEY = "saved-vocab";

export function getSavedVocab(): SavedVocabItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function isVocabSaved(word: string, storySlug: string): boolean {
  return getSavedVocab().some((v) => v.word === word && v.storySlug === storySlug);
}

export function addToVocab(item: SavedVocabItem): void {
  const current = getSavedVocab().filter(
    (v) => !(v.word === item.word && v.storySlug === item.storySlug)
  );
  current.push(item);
  localStorage.setItem(KEY, JSON.stringify(current));
}

export function toggleSavedVocab(item: SavedVocabItem): boolean {
  const current = getSavedVocab();
  const idx = current.findIndex((v) => v.word === item.word && v.storySlug === item.storySlug);
  if (idx >= 0) {
    current.splice(idx, 1);
    localStorage.setItem(KEY, JSON.stringify(current));
    return false;
  }
  current.push(item);
  localStorage.setItem(KEY, JSON.stringify(current));
  return true;
}
