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

type ArchiveEntry = { date: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDropdownDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

function ReadingGrid({ readings, onSelect }: { readings: Story[]; onSelect: (s: Story) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {readings.map((reading) => {
        const cfg = TYPE_CONFIG[reading.readingType];
        return (
          <button
            key={reading.slug}
            onClick={() => onSelect(reading)}
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
  );
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

export default function ArchivePage() {
  const [dates, setDates] = useState<ArchiveEntry[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);

  const [selectedEntry, setSelectedEntry] = useState<ArchiveEntry | null>(null);
  const [readings, setReadings] = useState<Story[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Load available archive dates
  useEffect(() => {
    fetch("/api/readings-archive")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setDates(d as ArchiveEntry[]);
          setSelectedEntry(d[0]); // default to most recent past date
        }
      })
      .catch(() => {})
      .finally(() => setDatesLoading(false));
  }, []);

  // Load readings when selected date changes
  useEffect(() => {
    if (!selectedEntry) return;
    setReadingsLoading(true);
    setReadings([]);
    fetch(`/api/readings/${selectedEntry.date}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setReadings(d as Story[]); })
      .catch(() => {})
      .finally(() => setReadingsLoading(false));
  }, [selectedEntry]);

  if (selectedStory) {
    return (
      <StoryView
        key={selectedStory.slug}
        story={selectedStory}
        onBack={() => setSelectedStory(null)}
      />
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Past Reads</h1>
        <p className="text-sm text-gray-400 mt-1">Browse previous daily reading editions</p>
      </div>

      {/* No archive yet */}
      {!datesLoading && dates.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No past readings yet</p>
          <p className="text-xs text-gray-400 mt-1">Past editions will appear here from tomorrow onwards.</p>
        </div>
      )}

      {/* Date dropdown + readings */}
      {dates.length > 0 && (
        <>
          {/* Dropdown */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Select a date
            </label>
            <div className="relative">
              <select
                value={selectedEntry?.date ?? ""}
                onChange={(e) => {
                  const entry = dates.find((d) => d.date === e.target.value);
                  if (entry) setSelectedEntry(entry);
                }}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer"
              >
                {dates.map((entry) => (
                  <option key={entry.date} value={entry.date}>
                    {formatDropdownDate(entry.date)}
                  </option>
                ))}
              </select>
              {/* Dropdown arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {selectedEntry && (
              <p className="text-xs text-gray-400 mt-2">{formatDate(selectedEntry.date)}</p>
            )}
          </div>

          {/* Reading cards */}
          {readingsLoading && <LoadingSkeleton />}

          {!readingsLoading && readings.length > 0 && (
            <ReadingGrid readings={readings} onSelect={setSelectedStory} />
          )}

          {!readingsLoading && readings.length === 0 && selectedEntry && (
            <div className="border border-dashed border-gray-200 rounded-2xl py-10 text-center">
              <p className="text-sm text-gray-400">Could not load readings for this date.</p>
            </div>
          )}
        </>
      )}

    </main>
  );
}
