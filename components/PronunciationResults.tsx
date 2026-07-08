"use client";

import { PronunciationClip } from "@/lib/pronounceCache.server";

type Props = {
  word: string;
  clips: PronunciationClip[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function highlight(text: string, word: string) {
  const pattern = new RegExp(`(${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
  const parts = text.split(pattern);
  // split() with a capturing group alternates [non-match, match, non-match, ...]
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-100 text-gray-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PronunciationResults({ word, clips, selectedIndex, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {clips.map((clip, i) => (
        <li key={clip.sentenceId}>
          <button
            onClick={() => onSelect(i)}
            className={`w-full text-left p-3 rounded-xl border transition-colors ${
              i === selectedIndex
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-800 line-clamp-2">{highlight(clip.text, word)}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
