"use client";

import { useEffect, useState } from "react";
import { SavedVocabItem } from "@/lib/types";
import { getSavedVocab, removeFromVocab } from "@/lib/savedVocab";

export default function VocabPage() {
  const [items, setItems] = useState<SavedVocabItem[]>([]);

  const load = () => { getSavedVocab().then(setItems); };

  useEffect(() => { load(); }, []);

  const handleRemove = async (word: string) => {
    await removeFromVocab(word);
    load();
  };

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Vocab Collection</h1>
        <p className="text-sm text-gray-500">
          {items.length > 0
            ? `${items.length} word${items.length !== 1 ? "s" : ""} saved.`
            : "Tap any word in a story to save it here."}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm mb-1">No saved vocab yet.</p>
          <p className="text-gray-400 text-sm">Tap any word while reading to save it.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {items.map((item, i) => (
              <div key={`${item.word}-${i}`} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.word}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.meaning}</p>
                  {item.example && (
                    <p className="text-xs text-gray-400 italic mt-1 leading-relaxed">{item.example}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.word)}
                  title="Remove"
                  className="text-yellow-400 hover:text-gray-300 transition-colors text-xl flex-shrink-0 mt-0.5"
                >
                  ★
                </button>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-700">German word</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">English meaning</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Example</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={`${item.word}-${i}`} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.word}</td>
                    <td className="px-4 py-3 text-gray-600">{item.meaning}</td>
                    <td className="px-4 py-3 text-gray-500 italic">{item.example}</td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => handleRemove(item.word)} title="Remove" className="text-xl leading-none text-yellow-400 hover:text-gray-300 transition-colors">★</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
