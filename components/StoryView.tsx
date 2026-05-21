"use client";

import { useState, useCallback } from "react";
import { Story, ReadingType } from "@/lib/types";
import WordPopup from "./WordPopup";
import QuizSection from "./QuizSection";

const TYPE_CONFIG: Record<ReadingType, { label: string; icon: string; bg: string; text: string }> = {
  news:     { label: "Nachrichten", icon: "📰", bg: "bg-blue-50",   text: "text-blue-700" },
  dialogue: { label: "Gespräch",    icon: "💬", bg: "bg-violet-50", text: "text-violet-700" },
  story:    { label: "Geschichte",  icon: "📖", bg: "bg-emerald-50",text: "text-emerald-700" },
  speaking: { label: "A2 Sprechen", icon: "🗣️", bg: "bg-orange-50", text: "text-orange-700" },
};

type PopupState = {
  word: string;
  sentence: string;
  x: number;
  y: number;
};

function cleanWord(token: string): string {
  return token.replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/g, "");
}

function extractSentence(paragraph: string, word: string): string {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  return sentences.find((s) => s.includes(word)) ?? paragraph.slice(0, 150);
}

type ParagraphProps = {
  text: string;
  onWordClick: (word: string, sentence: string, x: number, y: number) => void;
};

function ClickableParagraph({ text, onWordClick }: ParagraphProps) {
  const tokens = text.split(/(\s+)/);
  return (
    <p className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-gray-800 text-left sm:text-justify" lang="de">
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return token;
        const word = cleanWord(token);
        if (!word) return token;
        return (
          <span
            key={i}
            onClick={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              onWordClick(word, extractSentence(text, word), rect.left + rect.width / 2, rect.bottom);
            }}
            className="cursor-pointer rounded px-0.5 -mx-0.5 active:bg-yellow-100 hover:bg-yellow-100 transition-colors"
          >
            {token}
          </span>
        );
      })}
    </p>
  );
}

type Props = {
  story: Story;
  onBack?: () => void;
};

export default function StoryView({ story, onBack }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null);

  const handleWordClick = useCallback((word: string, sentence: string, x: number, y: number) => {
    setPopup({ word, sentence, x, y });
  }, []);

  const closePopup = useCallback(() => setPopup(null), []);

  const paragraphs = story.story.split(/\n+/).filter(Boolean);
  const cfg = TYPE_CONFIG[story.readingType];

  return (
    <article className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5 print:hidden"
        >
          ← Back to today&apos;s edition
        </button>
      )}

      {/* Reading header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
          <span className="text-xs text-gray-400">{story.date}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{story.topic}</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 leading-snug">{story.title}</h1>
        <p className="text-xs text-gray-400 mt-2">Tap any word to save it to your vocab list.</p>
      </div>

      {/* Story text */}
      <section className="bg-white border border-gray-200 rounded-2xl px-5 py-7 sm:px-14 sm:py-12 mb-4 sm:mb-6 space-y-5 sm:space-y-6">
        {paragraphs.map((para, i) => (
          <ClickableParagraph key={i} text={para} onWordClick={handleWordClick} />
        ))}
      </section>

      {/* Quiz */}
      {(story.quiz.questions?.length ?? 0) > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl px-5 py-7 sm:px-14 sm:py-12 print:hidden">
          <QuizSection questions={story.quiz.questions} />
        </section>
      )}

      {/* Print button */}
      <div className="mt-5 sm:mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Print
        </button>
      </div>

      {popup && (
        <WordPopup
          word={popup.word}
          sentence={popup.sentence}
          storySlug={story.slug}
          storyTitle={story.title}
          storyVocabulary={story.vocabulary}
          position={{ x: popup.x, y: popup.y }}
          onClose={closePopup}
        />
      )}
    </article>
  );
}
