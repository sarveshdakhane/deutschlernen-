"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SavedVocabItem } from "@/lib/types";
import { getSavedVocab, toggleSavedVocab } from "@/lib/savedVocab";

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
  return `Week of ${fmt(monday)} – ${sunday.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export default function VocabPage() {
  const [groups, setGroups] = useState<[string, SavedVocabItem[]][]>([]);

  const load = () => {
    const items = getSavedVocab();
    const map = new Map<string, SavedVocabItem[]>();
    for (const item of items) {
      const key = getWeekStart(item.savedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    setGroups([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = (item: SavedVocabItem) => {
    toggleSavedVocab(item);
    load();
  };

  const total = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Vocab Collection</h1>
        <p className="text-sm text-gray-500">
          {total > 0 ? `${total} word${total !== 1 ? "s" : ""} saved, grouped by week.` : "Words you save will appear here."}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">No saved vocab yet.</p>
          <p className="text-gray-400 text-sm">
            Open a story and click ★ next to any word to save it.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([weekKey, items]) => (
            <section key={weekKey}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {formatWeekLabel(weekKey)} · {items.length} word{items.length !== 1 ? "s" : ""}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-700">German word</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700">English meaning</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 hidden sm:table-cell">Example</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Story</th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr
                        key={`${item.word}-${i}`}
                        className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{item.word}</td>
                        <td className="px-4 py-3 text-gray-600">{item.meaning}</td>
                        <td className="px-4 py-3 text-gray-500 italic hidden sm:table-cell">{item.example}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Link
                            href={`/stories/${item.storySlug}`}
                            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {item.storyTitle}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleRemove(item)}
                            title="Remove from vocab list"
                            className="text-lg leading-none text-yellow-400 hover:text-gray-300 transition-colors"
                          >
                            ★
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
