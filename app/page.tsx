"use client";

import { useEffect, useState } from "react";
import { Story, ReadingType } from "@/lib/types";
import StoryView from "@/components/StoryView";

const TYPE_CONFIG: Record<ReadingType, { label: string; icon: string; bg: string; text: string }> = {
  news:     { label: "Nachrichten", icon: "📰", bg: "bg-blue-50",   text: "text-blue-700" },
  dialogue: { label: "Gespräch",    icon: "💬", bg: "bg-violet-50", text: "text-violet-700" },
  story:    { label: "Geschichte",  icon: "📖", bg: "bg-emerald-50",text: "text-emerald-700" },
  speaking: { label: "A2 Sprechen", icon: "🗣️", bg: "bg-orange-50", text: "text-orange-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
          <div className="h-32 sm:h-36 bg-gray-100" />
          <div className="p-4 sm:p-5">
            <div className="h-3 w-20 bg-gray-100 rounded-full mb-3" />
            <div className="h-4 w-full bg-gray-100 rounded-full mb-2" />
            <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [readings, setReadings] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Story | null>(null);

  useEffect(() => {
    fetch("/api/generate-story")
      .then((r) => { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); })
      .then((d) => { if (Array.isArray(d)) setReadings(d as Story[]); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setSelected(null);
    window.addEventListener("todays-read-home", handler);
    return () => window.removeEventListener("todays-read-home", handler);
  }, []);

  if (selected) {
    return <StoryView key={selected.slug} story={selected} onBack={() => setSelected(null)} />;
  }

  const today = readings[0]?.date ?? new Date().toISOString().split("T")[0];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Today&apos;s Read</h1>
        {!loading && !error && <p className="text-sm text-gray-400 mt-1">{formatDate(today)}</p>}
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && readings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {readings.map((reading) => {
            const cfg = TYPE_CONFIG[reading.readingType];
            return (
              <button
                key={reading.slug}
                onClick={() => setSelected(reading)}
                className="text-left bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all group flex flex-col overflow-hidden"
              >
                {reading.imageUrl && (
                  <img src={reading.imageUrl} alt={reading.topic} className="w-full h-32 sm:h-36 object-cover" />
                )}
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span>{cfg.icon}</span>{cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{reading.difficulty}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-700 transition-colors flex-1">
                    {reading.title}
                  </h2>
                  <p className="text-xs text-gray-500 line-clamp-1">{reading.topic}</p>
                  <p className="text-xs text-gray-400 mt-3 font-medium group-hover:text-blue-600 transition-colors">Lesen →</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Past Reads banner */}
      <div className="mt-10 border border-gray-200 rounded-2xl px-5 py-4 bg-white flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Past Reads</p>
          <p className="text-xs text-gray-400 mt-0.5">Browse previous daily editions</p>
        </div>
        <a href="/archive" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          View all →
        </a>
      </div>

    </main>
  );
}
