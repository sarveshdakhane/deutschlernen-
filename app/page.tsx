"use client";

import { useEffect, useState, useCallback } from "react";
import { Story } from "@/lib/types";
import { getTodayStory, saveStory } from "@/lib/storyStorage";
import StoryView from "@/components/StoryView";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function HomePage() {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cached = getTodayStory();
    if (cached) {
      setStory(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/generate-story");
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as Story & { error?: string };
      if (data.error) throw new Error(data.error);
      saveStory(data);
      setStory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  return (
    <main>
      {loading ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ErrorState message={error} onRetry={loadStory} />
        </div>
      ) : story ? (
        <StoryView story={story} />
      ) : null}
    </main>
  );
}
