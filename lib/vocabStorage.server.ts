import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { SavedVocabItem } from "./types";

const FILE = path.join(process.cwd(), "data", "vocab.json");

export function readVocab(): SavedVocabItem[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function writeVocab(items: SavedVocabItem[]): void {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(items, null, 2), "utf-8");
}
