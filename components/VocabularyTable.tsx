"use client";

import { VocabularyItem } from "@/lib/types";

type Props = {
  vocabulary: VocabularyItem[];
  showMeanings: boolean;
};

export default function VocabularyTable({ vocabulary, showMeanings }: Props) {
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
