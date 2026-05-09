"use client";

import { useEffect, useState } from "react";
import { Story } from "@/lib/types";
import StoryCard from "@/components/StoryCard";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function ArchivePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setStories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Story Archive</h1>
        <p className="text-sm text-gray-500">Browse all previous daily German B1 stories.</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : stories.length === 0 ? (
        <p className="text-gray-400 text-sm">No archived stories yet.</p>
      ) : (
        <div className="grid gap-4">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      )}
    </main>
  );
}
