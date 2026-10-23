"use client";

import { VocabularyItem } from "@/lib/types";

type Props = {
  vocabulary: VocabularyItem[];
  showMeanings: boolean;
};

export default function VocabularyTable({ vocabulary, showMeanings }: Props) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-100 mb-3">Vocabulary</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-300 w-1/4">German word</th>
              {showMeanings && (
                <th className="text-left px-4 py-3 font-medium text-slate-300 w-1/4">English meaning</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-slate-300">Example sentence</th>
            </tr>
          </thead>
          <tbody>
            {vocabulary.map((item, i) => (
              <tr key={i} className={`border-b border-slate-800 last:border-0 ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-800/40"}`}>
                <td className="px-4 py-3 font-medium text-slate-100">{item.word}</td>
                {showMeanings && <td className="px-4 py-3 text-slate-400">{item.meaning}</td>}
                <td className="px-4 py-3 text-slate-400 italic">{item.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
