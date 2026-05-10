"use client";

import { useEffect, useState } from "react";
import { Story } from "@/lib/types";
import { getStoredStories } from "@/lib/storyStorage";
import StoryCard from "@/components/StoryCard";

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function formatWeekLabel(weekKey: string): string {
  const monday = new Date(weekKey);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${sunday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export default function WeeklyPage() {
  const [groups, setGroups] = useState<[string, Story[]][]>([]);

  useEffect(() => {
    const stories = getStoredStories();
    const map = new Map<string, Story[]>();
    for (const story of stories) {
      const key = getWeekStart(story.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(story);
    }
    setGroups([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }, []);

  const total = groups.reduce((n, [, s]) => n + s.length, 0);

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Weekly Stories</h1>
        <p className="text-sm text-gray-500">
          {total > 0
            ? `${total} stor${total !== 1 ? "ies" : "y"} — click any to review.`
            : "Stories you read each day will appear here."}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">No stories yet.</p>
          <p className="text-gray-400 text-sm">
            Come back after reading today&apos;s story on the home page.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([weekKey, stories]) => (
            <section key={weekKey}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {formatWeekLabel(weekKey)} · {stories.length} stor{stories.length !== 1 ? "ies" : "y"}
              </h2>
              <div className="grid gap-4">
                {stories.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
