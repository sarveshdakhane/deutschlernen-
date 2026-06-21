"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  word: string;
  sentence: string;
  position: { x: number; y: number };
  onClose: () => void;
};

const POPUP_WIDTH = 300;

type CardState =
  | { status: "loading" }
  | { status: "ready"; meaning: string }
  | { status: "error" };

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

export default function WordPopup({ word, sentence, position, onClose }: Props) {
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const ref = useRef<HTMLDivElement>(null);
  const mobile = isMobileViewport();

  const left = Math.min(
    Math.max(8, position.x - POPUP_WIDTH / 2),
    (typeof window !== "undefined" ? window.innerWidth : 900) - POPUP_WIDTH - 8,
  );

  useEffect(() => {
    const params = new URLSearchParams({ word, sentence });
    fetch(`/api/translate-word?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.meaning) setCard({ status: "ready", meaning: data.meaning });
        else setCard({ status: "error" });
      })
      .catch(() => setCard({ status: "error" }));
  }, [word, sentence]);

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

  const style: React.CSSProperties = mobile
    ? { position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }
    : { position: "fixed", left, top: position.y + 16, width: POPUP_WIDTH, zIndex: 50 };

  const roundedClass = mobile ? "rounded-t-2xl rounded-b-none" : "rounded-2xl";

  return (
    <>
      {mobile && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      <div ref={ref} style={style} className={`bg-white shadow-2xl overflow-hidden ${roundedClass} border border-gray-200`}>
        {mobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
        )}

        <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900 tracking-tight">{word}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className={`px-4 py-3 ${mobile ? "pb-7" : ""}`}>
          {card.status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block" />
              Looking up…
            </div>
          ) : card.status === "ready" ? (
            <p className="text-sm text-gray-700">{card.meaning}</p>
          ) : (
            <p className="text-sm text-gray-400">No translation found.</p>
          )}
        </div>
      </div>
    </>
  );
}
