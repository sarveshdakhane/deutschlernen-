"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Story } from "@/lib/types";
import { getStoredStories } from "@/lib/storyStorage";
import StoryView from "@/components/StoryView";
import ErrorState from "@/components/ErrorState";
import Link from "next/link";

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const found = getStoredStories().find((s) => s.slug === slug) ?? null;
    if (found) {
      setStory(found);
    } else {
      setNotFound(true);
    }
  }, [slug]);

  return (
    <main>
      <div className="max-w-3xl mx-auto px-4 pt-6 print:hidden">
        <Link href="/stories" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to Weekly
        </Link>
      </div>

      {notFound ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ErrorState message="Story not found." />
        </div>
      ) : story ? (
        <StoryView story={story} />
      ) : null}
    </main>
  );
}
