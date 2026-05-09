"use client";

import { useState } from "react";
import { Story } from "@/lib/types";
import VocabularyTable from "./VocabularyTable";
import SentencePatterns from "./SentencePatterns";
import QuizSection from "./QuizSection";

const GRAMMAR_LABELS: Record<string, string> = {
  praesens: "Präsens",
  perfekt: "Perfekt",
  modalverben: "Modalverben",
  nebensaetze: "Nebensätze",
  relativsaetze: "Relativsätze",
  konjunktivII: "Konjunktiv II",
  passiv: "Passiv",
};

type Props = {
  story: Story;
  onGenerate?: () => void;
  onNewTopic?: () => void;
  isHomepage?: boolean;
};

export default function StoryView({ story, onGenerate, onNewTopic, isHomepage }: Props) {
  const [showMeanings, setShowMeanings] = useState(true);

  const paragraphs = story.story.split(/\n+/).filter(Boolean);

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      {/* Action buttons */}
      {isHomepage && (
        <div className="flex flex-wrap gap-2 mb-8 print:hidden">
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Today&apos;s Story
            </button>
          )}
          {onNewTopic && (
            <button
              onClick={onNewTopic}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              New Practice Topic
            </button>
          )}
          <button
            onClick={() => setShowMeanings((v) => !v)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showMeanings ? "Hide" : "Show"} English Meanings
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Print
          </button>
        </div>
      )}

      {/* Story header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
            {story.difficulty}
          </span>
          <span className="text-xs text-gray-400">{story.date}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{story.topic}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{story.title}</h1>
      </div>

      {/* PAGE 1 — Story */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 mb-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Page 1 — Story</div>
        <div className="space-y-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base text-gray-800 leading-relaxed">
              {para}
            </p>
          ))}
        </div>

        {/* Grammar checklist */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">B1 Grammar included</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(story.grammarChecklist).map(([key, value]) => (
              <span
                key={key}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  value
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400 line-through"
                }`}
              >
                {GRAMMAR_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PAGE 2 — Learning section */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-8">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Page 2 — Learning Section</div>

        <VocabularyTable vocabulary={story.vocabulary} showMeanings={showMeanings} />

        <div className="border-t border-gray-100 pt-8">
          <SentencePatterns patterns={story.sentencePatterns} showMeanings={showMeanings} />
        </div>

        <div className="border-t border-gray-100 pt-8">
          <QuizSection
            readingQuestions={story.quiz.readingQuestions}
            writingPrompts={story.quiz.writingPrompts}
          />
        </div>
      </section>

      {/* Non-homepage toggle */}
      {!isHomepage && (
        <div className="mt-6 flex gap-3 print:hidden">
          <button
            onClick={() => setShowMeanings((v) => !v)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showMeanings ? "Hide" : "Show"} English Meanings
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Print
          </button>
        </div>
      )}
    </article>
  );
}
