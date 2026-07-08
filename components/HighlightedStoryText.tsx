"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WordTiming } from "@/lib/types";

type Props = {
  paragraphs: string[];
  timingsUrl?: string;
  currentTime: number;
  isPlaying: boolean;
};

type Token = { text: string; wordIndex: number | null };

function tokenizeParagraph(text: string, startIndex: number): { tokens: Token[]; nextIndex: number } {
  const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
  return parts.reduce<{ tokens: Token[]; nextIndex: number }>(
    (acc, part) => {
      if (/^\s+$/.test(part)) {
        return { tokens: [...acc.tokens, { text: part, wordIndex: null }], nextIndex: acc.nextIndex };
      }
      return {
        tokens: [...acc.tokens, { text: part, wordIndex: acc.nextIndex }],
        nextIndex: acc.nextIndex + 1,
      };
    },
    { tokens: [], nextIndex: startIndex }
  );
}

export default function HighlightedStoryText({ paragraphs, timingsUrl, currentTime, isPlaying }: Props) {
  const [timings, setTimings] = useState<WordTiming[] | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const lastScrolledIndex = useRef(-1);

  useEffect(() => {
    if (!timingsUrl) return;
    let cancelled = false;
    fetch(timingsUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WordTiming[] | null) => {
        if (!cancelled && data?.length) setTimings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [timingsUrl]);

  const { paragraphTokens, totalWords } = useMemo(() => {
    return paragraphs.reduce<{ paragraphTokens: Token[][]; totalWords: number }>(
      (acc, para) => {
        const { tokens, nextIndex } = tokenizeParagraph(para, acc.totalWords);
        return { paragraphTokens: [...acc.paragraphTokens, tokens], totalWords: nextIndex };
      },
      { paragraphTokens: [], totalWords: 0 }
    );
  }, [paragraphs]);

  // Whisper's transcribed word count can drift slightly from our original text
  // (numbers, abbreviations read aloud differently) — rescale its timing index
  // proportionally onto our word positions so highlighting stays roughly in sync.
  const activeWordIndex = useMemo(() => {
    if (!timings || !timings.length) return -1;

    let matched = -1;
    for (let i = 0; i < timings.length; i++) {
      if (currentTime >= timings[i].start && (i === timings.length - 1 || currentTime < timings[i + 1].start)) {
        matched = i;
        break;
      }
    }
    if (matched === -1) return -1;
    if (totalWords === timings.length || totalWords <= 1 || timings.length <= 1) return matched;
    return Math.round((matched * (totalWords - 1)) / (timings.length - 1));
  }, [timings, currentTime, totalWords]);

  useEffect(() => {
    if (!isPlaying || activeWordIndex === -1 || activeWordIndex === lastScrolledIndex.current) return;
    lastScrolledIndex.current = activeWordIndex;
    activeWordRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeWordIndex, isPlaying]);

  return (
    <>
      {paragraphTokens.map((tokens, pi) => (
        <p
          key={pi}
          className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-gray-800 text-left sm:text-justify hyphens-none"
          lang="de"
        >
          {tokens.map((token, ti) => {
            const isActive = token.wordIndex !== null && token.wordIndex === activeWordIndex;
            return (
              <span
                key={ti}
                ref={isActive ? activeWordRef : undefined}
                className={isActive ? "bg-amber-200/80 text-gray-900 rounded px-0.5 -mx-0.5 transition-colors" : undefined}
              >
                {token.text}
              </span>
            );
          })}
        </p>
      ))}
    </>
  );
}
