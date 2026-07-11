"use client";

import { useMemo, useState } from "react";
import { PrepositionQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];

function SentenceWithBlank({ sentence, filled, correct }: { sentence: string; filled: string | null; correct: boolean | null }) {
  const [before, after] = useMemo(() => {
    const idx = sentence.indexOf("___");
    return idx === -1 ? [sentence, ""] : [sentence.slice(0, idx), sentence.slice(idx + 3)];
  }, [sentence]);

  const blankStyle = !filled
    ? "border-gray-300 text-gray-300"
    : correct
    ? "border-green-500 text-green-700 bg-green-50"
    : "border-red-400 text-red-700 bg-red-50";

  return (
    <p className="text-base sm:text-lg text-gray-900 leading-relaxed">
      {before}
      <span className={`inline-block px-2 py-0.5 mx-1 rounded-lg border-b-2 font-semibold ${blankStyle}`}>
        {filled ?? "___"}
      </span>
      {after}
    </p>
  );
}

function Question({ q, index, total, onAnswered }: { q: PrepositionQuestion; index: number; total: number; onAnswered: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    onAnswered(i === q.answer);
  };

  const getStyle = (i: number) => {
    if (selected === null) {
      return "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer";
    }
    if (i === q.answer) return "border-green-400 bg-green-50 text-green-800";
    if (i === selected) return "border-red-300 bg-red-50 text-red-700";
    return "border-gray-100 bg-gray-50 text-gray-400";
  };

  return (
    <div className="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-white">
      <p className="text-xs font-semibold text-gray-400 mb-2">Satz {index + 1} / {total}</p>
      <SentenceWithBlank
        sentence={q.sentence}
        filled={selected !== null ? q.options[selected] : null}
        correct={selected !== null ? selected === q.answer : null}
      />

      <div className="grid grid-cols-2 gap-2 mt-4">
        {q.options.map((option, i) => (
          <button
            key={i}
            disabled={selected !== null}
            onClick={() => handleSelect(i)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${getStyle(i)}`}
          >
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border
                ${selected === null ? "border-gray-300 text-gray-500" :
                  i === q.answer ? "border-green-500 bg-green-500 text-white" :
                  i === selected ? "border-red-400 bg-red-400 text-white" :
                  "border-gray-200 text-gray-400"}`}
            >
              {LETTERS[i]}
            </span>
            {option}
          </button>
        ))}
      </div>

      {selected !== null && q.translation && (
        <p className="text-xs text-gray-400 mt-3 italic">{q.translation}</p>
      )}
    </div>
  );
}

type Props = {
  questions: PrepositionQuestion[];
};

export default function PrepositionPractice({ questions }: Props) {
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  if (!questions?.length) return null;

  const handleAnswered = (correct: boolean) => {
    setAnsweredCount((c) => c + 1);
    if (correct) setCorrectCount((c) => c + 1);
  };

  const allAnswered = answeredCount === questions.length;

  return (
    <div>
      {allAnswered && (
        <div className="mb-6 border border-gray-200 rounded-2xl px-5 py-4 bg-white flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Ergebnis</p>
            <p className="text-xs text-gray-400 mt-0.5">Du hast heute alle Sätze beantwortet.</p>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {correctCount} / {questions.length}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Question key={i} q={q} index={i} total={questions.length} onAnswered={handleAnswered} />
        ))}
      </div>
    </div>
  );
}
