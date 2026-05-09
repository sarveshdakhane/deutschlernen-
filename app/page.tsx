"use client";

import { useEffect, useState, useCallback } from "react";
import { Story } from "@/lib/types";
import StoryView from "@/components/StoryView";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

const TOPICS = [
  "moving to a new city",
  "finding an apartment",
  "first day at work",
  "visiting the doctor",
  "planning a holiday",
  "writing to a language school",
  "solving a problem with a neighbour",
  "public transport problem",
  "healthy lifestyle",
  "learning German for work",
];

function getRandomTopic(exclude?: string): string {
  const filtered = TOPICS.filter((t) => t !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export default function HomePage() {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | undefined>();

  const fetchStory = useCallback(async (topic?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = topic
        ? `/api/generate-story?topic=${encodeURIComponent(topic)}`
        : "/api/generate-story";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStory(data);
      setCurrentTopic(topic);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const handleGenerate = () => fetchStory();
  const handleNewTopic = () => fetchStory(getRandomTopic(currentTopic));

  return (
    <main>
      {loading ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ErrorState message={error} onRetry={() => fetchStory()} />
        </div>
      ) : story ? (
        <StoryView
          story={story}
          onGenerate={handleGenerate}
          onNewTopic={handleNewTopic}
          isHomepage
        />
      ) : null}
    </main>
  );
}
