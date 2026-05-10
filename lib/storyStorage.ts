import { Story } from "./types";

const KEY = "daily-stories";

export function getStoredStories(): Story[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getTodayStory(): Story | null {
  const today = new Date().toISOString().split("T")[0];
  const story = getStoredStories().find((s) => s.date === today) ?? null;
  // Discard stories cached before the MCQ quiz format was introduced
  if (story && !Array.isArray(story.quiz?.questions)) return null;
  return story;
}

export function saveStory(story: Story): void {
  const stories = getStoredStories().filter((s) => s.date !== story.date);
  stories.push(story);
  stories.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(KEY, JSON.stringify(stories.slice(0, 90)));
}
