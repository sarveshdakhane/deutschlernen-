"use client";

import { useEffect, useState } from "react";
import { PrepositionQuestion } from "@/lib/types";
import PrepositionPractice from "@/components/PrepositionPractice";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-white animate-pulse">
          <div className="h-3 w-16 bg-gray-100 rounded-full mb-3" />
          <div className="h-4 w-full bg-gray-100 rounded-full mb-4" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-10 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PraepositionenPage() {
  const [date, setDate] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PrepositionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prepositions")
      .then((r) => { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); })
      .then((d: { date: string; questions: PrepositionQuestion[] }) => {
        setDate(d.date);
        setQuestions(d.questions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Präpositionen</h1>
        <p className="text-sm text-gray-400 mt-1">
          7 neue B1-Sätze zum Üben deutscher Präpositionen — jeden Tag neu.
        </p>
        {!loading && !error && date && <p className="text-xs text-gray-400 mt-1">{formatDate(date)}</p>}
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && questions.length > 0 && (
        <PrepositionPractice questions={questions} />
      )}
    </main>
  );
}
