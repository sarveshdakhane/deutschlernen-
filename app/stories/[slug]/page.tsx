"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Story } from "@/lib/types";
import StoryView from "@/components/StoryView";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import Link from "next/link";

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/stories/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Story not found");
        return res.json();
      })
      .then(setStory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main>
      <div className="max-w-3xl mx-auto px-4 pt-6 print:hidden">
        <Link href="/stories" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to Archive
        </Link>
      </div>

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <LoadingState />
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ErrorState message={error} />
        </div>
      ) : story ? (
        <StoryView story={story} />
      ) : null}
    </main>
  );
}
