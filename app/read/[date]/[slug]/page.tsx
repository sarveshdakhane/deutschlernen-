"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Story } from "@/lib/types";
import StoryView from "@/components/StoryView";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function ReadStoryPage() {
  const { date, slug } = useParams<{ date: string; slug: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split("T")[0];
        let res = await fetch(`/api/readings/${date}`);
        if (!res.ok && date === today) {
          res = await fetch("/api/generate-story");
        }
        if (!res.ok) throw new Error("Failed to load story");
        const data = (await res.json()) as Story[];
        const match = data.find((s) => s.slug === slug) ?? null;
        if (cancelled) return;
        if (!match) throw new Error("Story not found");
        setStory(match);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [date, slug]);

  useEffect(() => {
    if (story) document.title = `${story.title} | Daily Deutsch`;
  }, [story]);

  if (loading) return <LoadingState message="Loading story…" />;
  if (error || !story) {
    return <ErrorState message={error ?? "Story not found"} onRetry={() => router.push("/")} />;
  }

  return <StoryView story={story} />;
}
