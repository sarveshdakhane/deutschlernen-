"use client";

import { useEffect, useRef, useState } from "react";
import { addToVocab, isVocabSaved } from "@/lib/savedVocab";

import { VocabularyItem } from "@/lib/types";

type Props = {
  word: string;
  sentence: string;
  storySlug: string;
  storyTitle: string;
  storyVocabulary: VocabularyItem[];
  position: { x: number; y: number };
  onClose: () => void;
};

const POPUP_WIDTH = 320;

type CardState =
  | { status: "loading" }
  | { status: "ready"; meaning: string; example: string }
  | { status: "manual" };

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

export default function WordPopup({
  word, sentence, storySlug, storyTitle, storyVocabulary, position, onClose,
}: Props) {
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const [saved, setSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    isVocabSaved(word).then(setSaved);
  }, [word]);
  const ref = useRef<HTMLDivElement>(null);
  const mobile = isMobileViewport();

  // Desktop positioning
  const left = Math.min(
    Math.max(8, position.x - POPUP_WIDTH / 2),
    (typeof window !== "undefined" ? window.innerWidth : 900) - POPUP_WIDTH - 8,
  );

  // Resolve meaning: story vocab → API
  useEffect(() => {
    const match = storyVocabulary.find(
      (v) => v.word.toLowerCase() === word.toLowerCase(),
    );
    if (match) {
      setCard({ status: "ready", meaning: match.meaning, example: match.example });
      return;
    }
    const params = new URLSearchParams({ word, sentence });
    fetch(`/api/translate-word?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.meaning) {
          setCard({ status: "ready", meaning: data.meaning, example: data.example ?? sentence });
        } else {
          setCard({ status: "manual" });
        }
      })
      .catch(() => setCard({ status: "manual" }));
  }, [word, sentence, storyVocabulary]);

  // Close on outside click or Escape
  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = "touches" in e ? e.touches[0]?.target : (e as MouseEvent).target;
      if (ref.current && target instanceof Node && !ref.current.contains(target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onPointer as (e: MouseEvent) => void);
    document.addEventListener("touchstart", onPointer as (e: TouchEvent) => void);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer as (e: MouseEvent) => void);
      document.removeEventListener("touchstart", onPointer as (e: TouchEvent) => void);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleSave = async (meaning: string, example: string) => {
    await addToVocab({ word, meaning, example, storySlug, storyTitle, savedAt: new Date().toISOString() });
    setSaved(true);
    setJustSaved(true);
    setTimeout(onClose, 900);
  };

  const style: React.CSSProperties = mobile
    ? { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }
    : { position: "fixed", left, top: position.y + 24, width: POPUP_WIDTH, zIndex: 50 };

  const roundedClass = mobile
    ? "rounded-t-2xl rounded-b-none"
    : "rounded-2xl";

  return (
    <>
      {/* Mobile backdrop */}
      {mobile && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      <div
        ref={ref}
        style={style}
        className={`bg-white shadow-2xl overflow-hidden ${roundedClass} border border-gray-200`}
      >
        {/* Drag handle (mobile only) */}
        {mobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
        )}

        {/* Word header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-900 tracking-tight">{word}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className={`px-5 py-4 ${mobile ? "pb-8" : ""}`}>
          {justSaved ? (
            <p className="text-sm text-green-600 font-medium text-center py-2">Saved to vocab ✓</p>

          ) : saved ? (
            <p className="text-sm text-gray-400 text-center py-2">Already in your vocab list.</p>

          ) : card.status === "loading" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-3">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block" />
              Looking up…
            </div>

          ) : card.status === "ready" ? (
            <ReadyCard meaning={(card as { status: "ready"; meaning: string; example: string }).meaning} example={(card as { status: "ready"; meaning: string; example: string }).example} onSave={handleSave} />

          ) : (
            <ManualCard sentence={sentence} onSave={handleSave} />
          )}
        </div>
      </div>
    </>
  );
}

function ReadyCard({ meaning, example, onSave }: {
  meaning: string; example: string; onSave: (m: string, e: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">English meaning</p>
        <p className="text-base font-medium text-gray-800">{meaning}</p>
      </div>
      <button
        onClick={() => onSave(meaning, example)}
        className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        Save to Vocab
      </button>
    </div>
  );
}

function ManualCard({ sentence, onSave }: { sentence: string; onSave: (m: string, e: string) => void }) {
  const [meaning, setMeaning] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Translation unavailable — add a meaning manually.</p>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">English meaning</p>
        <input
          autoFocus
          type="text"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && meaning.trim() && onSave(meaning, sentence)}
          placeholder="e.g. to move, the apartment"
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />
      </div>
      <button
        onClick={() => onSave(meaning, sentence)}
        disabled={!meaning.trim()}
        className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40"
      >
        Save to Vocab
      </button>
    </div>
  );
}
