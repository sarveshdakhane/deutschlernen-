"use client";

import { useState } from "react";
import { QuizQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];

function Question({ q, index }: { q: QuizQuestion; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);

  const getStyle = (i: number) => {
    if (selected === null) {
      return "border-slate-700 bg-slate-800 hover:border-blue-400 hover:bg-blue-500/10";
    }
    if (i === q.answer) return "border-green-500/60 bg-green-500/10 text-green-300";
    if (i === selected) return "border-red-500/60 bg-red-500/10 text-red-300";
    return "border-slate-800 bg-slate-800/50 text-slate-500";
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-200 mb-3">
        <span className="text-slate-500 mr-1">{index + 1}.</span> {q.question}
      </p>
      <div className="space-y-2">
        {q.options.map((option, i) => (
          <button
            key={i}
            disabled={selected !== null}
            onClick={() => setSelected(i)}
            className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm transition-all cursor-pointer disabled:cursor-default ${getStyle(i)}`}
          >
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border mt-0.5
              ${selected === null ? "border-slate-600 text-slate-400" :
                i === q.answer ? "border-green-500 bg-green-500 text-white" :
                i === selected ? "border-red-500 bg-red-500 text-white" :
                "border-slate-700 text-slate-500"}`}>
              {LETTERS[i]}
            </span>
            <span className="leading-relaxed">{option}</span>
            {selected !== null && i === q.answer && (
              <span className="ml-auto flex-shrink-0 text-green-400 text-xs font-semibold self-center">✓ correct</span>
            )}
            {selected === i && i !== q.answer && (
              <span className="ml-auto flex-shrink-0 text-red-400 text-xs font-semibold self-center">✗ wrong</span>
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
      <h3 className="text-base font-semibold text-slate-100 mb-1">Reading Quiz</h3>
      <p className="text-xs text-slate-500 mb-5">Choose the best answer for each question.</p>
      <div className="space-y-7">
        {questions.map((q, i) => (
          <Question key={i} q={q} index={i} />
        ))}
      </div>
    </div>
  );
}
