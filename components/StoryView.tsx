"use client";

import { useState, useRef } from "react";
import { Story, ReadingType } from "@/lib/types";
import QuizSection from "./QuizSection";

const TYPE_CONFIG: Record<ReadingType, { label: string; icon: string; bg: string; text: string }> = {
  news:     { label: "Nachrichten", icon: "📰", bg: "bg-blue-50",   text: "text-blue-700" },
  dialogue: { label: "Gespräch",    icon: "💬", bg: "bg-violet-50", text: "text-violet-700" },
  story:    { label: "Geschichte",  icon: "📖", bg: "bg-emerald-50",text: "text-emerald-700" },
  speaking: { label: "A2 Sprechen", icon: "🗣️", bg: "bg-orange-50", text: "text-orange-700" },
};

type Props = {
  story: Story;
  onBack?: () => void;
};

export default function StoryView({ story, onBack }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const edgeSwipe = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    edgeSwipe.current = e.touches[0].clientX < 32;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!edgeSwipe.current || !onBack) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > dx) { edgeSwipe.current = false; setSwipeX(0); return; }
    setSwipeX(Math.max(0, dx));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!edgeSwipe.current || !onBack) { setSwipeX(0); return; }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    setSwipeX(0);
    edgeSwipe.current = false;
    if (dx > 80 && dy < 80) onBack();
  };

  const paragraphs = story.story.split(/\n+/).filter(Boolean);
  const cfg = TYPE_CONFIG[story.readingType];

  const swipeProgress = Math.min(1, swipeX / 120);

  return (
    <article
      className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10"
      style={{
        transform: swipeX > 0 ? `translateX(${swipeX * 0.35}px)` : undefined,
        transition: swipeX === 0 ? "transform 0.2s ease" : "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe-back indicator */}
      {swipeProgress > 0 && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center bg-white rounded-r-2xl shadow-lg"
          style={{ width: 40 + swipeX * 0.15, height: 56, opacity: Math.min(1, swipeProgress * 1.5) }}
        >
          <span className="text-gray-500 text-lg">←</span>
        </div>
      )}

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
      </div>

      {/* Listen to the reading */}
      {story.audioUrl && (
        <div className="mb-4 sm:mb-6 print:hidden">
          <audio controls preload="none" src={story.audioUrl} className="w-full max-w-md">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Cover image */}
      {story.imageUrl && (
        <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden border border-gray-200">
          <img
            src={story.imageUrl}
            alt={story.topic}
            className="w-full object-cover max-h-64 sm:max-h-80"
          />
        </div>
      )}

      {/* Story text */}
      <section className="bg-white border border-gray-200 rounded-2xl px-5 py-7 sm:px-14 sm:py-12 mb-4 sm:mb-6 space-y-5 sm:space-y-6">
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-gray-800 text-left sm:text-justify hyphens-none"
            lang="de"
          >
            {para}
          </p>
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
    </article>
  );
}
