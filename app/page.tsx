"use client";

import { useEffect, useState, useCallback } from "react";
import { Story, ReadingType } from "@/lib/types";
import StoryView from "@/components/StoryView";

const TYPE_CONFIG: Record<ReadingType, { label: string; icon: string; bg: string; text: string }> = {
  news:     { label: "Nachrichten", icon: "📰", bg: "bg-blue-50",   text: "text-blue-700" },
  dialogue: { label: "Gespräch",    icon: "💬", bg: "bg-violet-50", text: "text-violet-700" },
  story:    { label: "Geschichte",  icon: "📖", bg: "bg-emerald-50",text: "text-emerald-700" },
  speaking: { label: "A2 Sprechen", icon: "🗣️", bg: "bg-orange-50", text: "text-orange-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function HomePage() {
  const [readings, setReadings] = useState<Story[]>([]);
  const [selected, setSelected] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    fetch(isRefresh ? "/api/generate-story?force=true" : "/api/generate-story")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch readings");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        setReadings(data as Story[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  useEffect(() => {
    const handler = () => setSelected(null);
    window.addEventListener("todays-read-home", handler);
    return () => window.removeEventListener("todays-read-home", handler);
  }, []);

  if (selected) {
    return (
      <StoryView
        key={selected.slug}
        story={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const today = readings[0]?.date ?? new Date().toISOString().split("T")[0];
  const isLoadingAny = loading || refreshing;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Today&apos;s Edition</h1>
          {!loading && !error && <p className="text-sm text-gray-400 mt-1">{formatDate(today)}</p>}
        </div>
        <button
          onClick={() => fetchReadings(true)}
          disabled={isLoadingAny}
          title="Refresh readings"
          className="mt-1 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-40"
        >
          <svg
            className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Loading / Refreshing skeleton */}
      {isLoadingAny && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 animate-pulse h-36">
              <div className="h-4 w-20 bg-gray-100 rounded-full mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded-full mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoadingAny && error && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {/* Reading list */}
      {!isLoadingAny && !error && readings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {readings.map((reading) => {
            const cfg = TYPE_CONFIG[reading.readingType];
            return (
              <button
                key={reading.slug}
                onClick={() => setSelected(reading)}
                className="text-left bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-gray-300 hover:shadow-md transition-all group flex flex-col"
              >
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <span>{cfg.icon}</span>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{reading.difficulty}</span>
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug mb-1.5 group-hover:text-blue-700 transition-colors flex-1">
                  {reading.title}
                </h2>
                <p className="text-xs text-gray-500 line-clamp-1">{reading.topic}</p>
                <p className="text-xs text-gray-400 mt-3 font-medium group-hover:text-blue-600 transition-colors">
                  Lesen →
                </p>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
