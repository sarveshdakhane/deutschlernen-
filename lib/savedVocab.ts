import { SavedVocabItem } from "./types";

const KEY = "saved-vocab";

function read(): SavedVocabItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function write(items: SavedVocabItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export async function getSavedVocab(): Promise<SavedVocabItem[]> {
  return read();
}

export async function isVocabSaved(word: string): Promise<boolean> {
  return read().some((v) => v.word.toLowerCase() === word.toLowerCase());
}

export async function addToVocab(item: SavedVocabItem): Promise<void> {
  const items = read();
  if (items.some((v) => v.word.toLowerCase() === item.word.toLowerCase())) return;
  items.push(item);
  write(items);
}

export async function removeFromVocab(word: string): Promise<void> {
  write(read().filter((v) => v.word.toLowerCase() !== word.toLowerCase()));
}
