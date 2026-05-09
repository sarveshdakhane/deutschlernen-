"use client";

import { useEffect, useState } from "react";
import { VocabularyItem } from "@/lib/types";
import { isVocabSaved, toggleSavedVocab } from "@/lib/savedVocab";

type Props = {
  vocabulary: VocabularyItem[];
  showMeanings: boolean;
  storySlug?: string;
  storyTitle?: string;
};

export default function VocabularyTable({ vocabulary, showMeanings, storySlug, storyTitle }: Props) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!storySlug) return;
    const state: Record<string, boolean> = {};
    for (const item of vocabulary) {
      state[item.word] = isVocabSaved(item.word, storySlug);
    }
    setSaved(state);
  }, [vocabulary, storySlug]);

  const handleToggle = (item: VocabularyItem) => {
    if (!storySlug || !storyTitle) return;
    const isSaved = toggleSavedVocab({
      word: item.word,
      meaning: item.meaning,
      example: item.example,
      storySlug,
      storyTitle,
      savedAt: new Date().toISOString(),
    });
    setSaved((prev) => ({ ...prev, [item.word]: isSaved }));
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">Vocabulary</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700 w-1/4">German word</th>
              {showMeanings && (
                <th className="text-left px-4 py-3 font-medium text-gray-700 w-1/4">English meaning</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-700">Example sentence</th>
              {storySlug && <th className="px-3 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {vocabulary.map((item, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{item.word}</td>
                {showMeanings && (
                  <td className="px-4 py-3 text-gray-600">{item.meaning}</td>
                )}
                <td className="px-4 py-3 text-gray-600 italic">{item.example}</td>
                {storySlug && (
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleToggle(item)}
                      title={saved[item.word] ? "Remove from vocab list" : "Save to vocab list"}
                      className={`text-lg leading-none transition-colors ${
                        saved[item.word]
                          ? "text-yellow-400 hover:text-gray-300"
                          : "text-gray-200 hover:text-yellow-400"
                      }`}
                    >
                      ★
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
