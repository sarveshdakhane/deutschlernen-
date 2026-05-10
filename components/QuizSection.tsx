"use client";

import { useState } from "react";
import { QuizQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];

function Question({ q, index }: { q: QuizQuestion; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);

  const getStyle = (i: number) => {
    if (selected === null) {
      return "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer";
    }
    if (i === q.answer) return "border-green-400 bg-green-50 text-green-800";
    if (i === selected) return "border-red-300 bg-red-50 text-red-700";
    return "border-gray-100 bg-gray-50 text-gray-400";
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-800 mb-3">
        <span className="text-gray-400 mr-1">{index + 1}.</span> {q.question}
      </p>
      <div className="space-y-2">
        {q.options.map((option, i) => (
          <button
            key={i}
            disabled={selected !== null}
            onClick={() => setSelected(i)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm transition-all ${getStyle(i)}`}
          >
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border mt-0.5
              ${selected === null ? "border-gray-300 text-gray-500" :
                i === q.answer ? "border-green-500 bg-green-500 text-white" :
                i === selected ? "border-red-400 bg-red-400 text-white" :
                "border-gray-200 text-gray-400"}`}>
              {LETTERS[i]}
            </span>
            <span className="leading-relaxed">{option}</span>
            {selected !== null && i === q.answer && (
              <span className="ml-auto flex-shrink-0 text-green-600 text-xs font-semibold self-center">✓ correct</span>
            )}
            {selected === i && i !== q.answer && (
              <span className="ml-auto flex-shrink-0 text-red-500 text-xs font-semibold self-center">✗ wrong</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type Props = {
  questions: QuizQuestion[];
};

export default function QuizSection({ questions }: Props) {
  if (!questions?.length) return null;

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Reading Quiz</h3>
      <p className="text-xs text-gray-400 mb-5">Choose the best answer for each question.</p>
      <div className="space-y-7">
        {questions.map((q, i) => (
          <Question key={i} q={q} index={i} />
        ))}
      </div>
    </div>
  );
}
