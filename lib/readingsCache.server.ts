import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { Story } from "./types";

const FILE = path.join(process.cwd(), "data", "readings.json");

type Cache = { date: string; readings: Story[] };

export function readCache(): Cache | null {
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function writeCache(readings: Story[]): void {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const date = new Date().toISOString().split("T")[0];
  writeFileSync(FILE, JSON.stringify({ date, readings }, null, 2), "utf-8");
}

export function getTodayReadings(): Story[] | null {
  const cache = readCache();
  const today = new Date().toISOString().split("T")[0];
  return cache?.date === today ? cache.readings : null;
}
