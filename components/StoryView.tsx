"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Story, ReadingType } from "@/lib/types";
import QuizSection from "./QuizSection";
import StoryParagraphs from "./StoryParagraphs";
import ListenMode from "./ListenMode";

const TYPE_CONFIG: Record<ReadingType, { label: string; icon: string; bg: string; text: string }> = {
  news:     { label: "Nachrichten", icon: "📰", bg: "bg-blue-500/10",    text: "text-blue-300" },
  dialogue: { label: "Gespräch",    icon: "💬", bg: "bg-violet-500/10",  text: "text-violet-300" },
  story:    { label: "Geschichte",  icon: "📖", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  speaking: { label: "A2 Sprechen", icon: "🗣️", bg: "bg-orange-500/10",  text: "text-orange-300" },
};

type Props = {
  story: Story;
};

export default function StoryView({ story }: Props) {
  const router = useRouter();
  const goHome = () => router.push("/");

  const [swipeX, setSwipeX] = useState(0);
  const [hideText, setHideText] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const edgeSwipe = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    edgeSwipe.current = e.touches[0].clientX < 32;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!edgeSwipe.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > dx) { edgeSwipe.current = false; setSwipeX(0); return; }
    setSwipeX(Math.max(0, dx));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!edgeSwipe.current) { setSwipeX(0); return; }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    setSwipeX(0);
    edgeSwipe.current = false;
    if (dx > 80 && dy < 80) goHome();
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
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center bg-slate-800 rounded-r-2xl shadow-lg"
          style={{ width: 40 + swipeX * 0.15, height: 56, opacity: Math.min(1, swipeProgress * 1.5) }}
        >
          <span className="text-slate-300 text-lg">←</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={goHome}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors mb-5 print:hidden"
      >
        ← Back to Home
      </button>

      {/* Reading header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">{story.date}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-400">{story.topic}</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-bold text-slate-100 leading-snug">{story.title}</h1>
      </div>

      {/* Cover image */}
      {story.imageUrl && (
        <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden border border-slate-700">
          <img
            src={story.imageUrl}
            alt={story.topic}
            className="w-full object-cover max-h-64 sm:max-h-80"
          />
        </div>
      )}

      {/* Listening practice */}
      <ListenMode paragraphs={paragraphs} hideText={hideText} onToggleHideText={() => setHideText((v) => !v)} />

      {/* Story text */}
      {hideText ? (
        <div className="flex items-center justify-center text-center bg-slate-800 border border-dashed border-slate-700 rounded-2xl px-5 py-12 mb-4 sm:mb-6">
          <p className="text-sm text-slate-500">
            Text ist versteckt — hör zu, dann beantworte das Quiz unten. Haken bei &quot;Text verstecken&quot; entfernen, um den Text zu sehen.
          </p>
        </div>
      ) : (
        <section className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-7 sm:px-14 sm:py-12 mb-4 sm:mb-6 space-y-5 sm:space-y-6">
          <StoryParagraphs paragraphs={paragraphs} />
        </section>
      )}

      {/* Quiz */}
      {(story.quiz.questions?.length ?? 0) > 0 && (
        <section className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-7 sm:px-14 sm:py-12 print:hidden">
          <QuizSection questions={story.quiz.questions} />
        </section>
      )}

      {/* Print button */}
      <div className="mt-5 sm:mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          Print
        </button>
      </div>
    </article>
  );
}
