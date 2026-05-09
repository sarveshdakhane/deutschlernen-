"use client";

import { SentencePattern } from "@/lib/types";

type Props = {
  patterns: SentencePattern[];
  showMeanings: boolean;
};

export default function SentencePatterns({ patterns, showMeanings }: Props) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">Useful Sentence Patterns</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700 w-1/3">German pattern</th>
              {showMeanings && (
                <th className="text-left px-4 py-3 font-medium text-gray-700 w-1/4">English meaning</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-700">Example sentence</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((item, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <td className="px-4 py-3 font-medium text-blue-800">{item.pattern}</td>
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
