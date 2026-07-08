"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WordTiming } from "@/lib/types";

type Props = {
  paragraphs: string[];
  timingsUrl?: string;
  currentTime: number;
  isPlaying: boolean;
};

type Token = { text: string; wordIndex: number | null; sentenceIndex: number | null };
type SentenceGroup = { sentenceIndex: number | null; text: string };

const SENTENCE_END = /[.!?]$/;

function tokenizeParagraph(
  text: string,
  startWordIndex: number,
  startSentenceIndex: number
): { tokens: Token[]; nextWordIndex: number; nextSentenceIndex: number } {
  const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
  const result = parts.reduce<{ tokens: Token[]; wordIndex: number; sentenceIndex: number }>(
    (acc, part) => {
      if (/^\s+$/.test(part)) {
        return { ...acc, tokens: [...acc.tokens, { text: part, wordIndex: null, sentenceIndex: null }] };
      }
      const token: Token = { text: part, wordIndex: acc.wordIndex, sentenceIndex: acc.sentenceIndex };
      return {
        tokens: [...acc.tokens, token],
        wordIndex: acc.wordIndex + 1,
        sentenceIndex: acc.sentenceIndex + (SENTENCE_END.test(part) ? 1 : 0),
      };
    },
    { tokens: [], wordIndex: startWordIndex, sentenceIndex: startSentenceIndex }
  );
  return { tokens: result.tokens, nextWordIndex: result.wordIndex, nextSentenceIndex: result.sentenceIndex };
}

// Merges consecutive tokens into per-sentence chunks so the whole sentence can
// be wrapped in a single highlight span instead of one span per word.
function groupBySentence(tokens: Token[]): SentenceGroup[] {
  const groups: SentenceGroup[] = [];
  for (const token of tokens) {
    const effectiveIndex = token.sentenceIndex ?? groups[groups.length - 1]?.sentenceIndex ?? null;
    const last = groups[groups.length - 1];
    if (last && last.sentenceIndex === effectiveIndex) {
      last.text += token.text;
    } else {
      groups.push({ sentenceIndex: effectiveIndex, text: token.text });
    }
  }
  return groups;
}

export default function HighlightedStoryText({ paragraphs, timingsUrl, currentTime, isPlaying }: Props) {
  const [timings, setTimings] = useState<WordTiming[] | null>(null);
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);
  const lastScrolledSentence = useRef(-1);

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
    return paragraphs.reduce<{ paragraphTokens: Token[][]; totalWords: number; sentenceIndex: number }>(
      (acc, para, i) => {
        const { tokens, nextWordIndex, nextSentenceIndex } = tokenizeParagraph(
          para,
          acc.totalWords,
          acc.sentenceIndex
        );
        // Force a sentence break between paragraphs even if the text didn't
        // end with terminal punctuation (e.g. a dialogue line without one).
        const isLastParagraph = i === paragraphs.length - 1;
        return {
          paragraphTokens: [...acc.paragraphTokens, tokens],
          totalWords: nextWordIndex,
          sentenceIndex: isLastParagraph ? nextSentenceIndex : nextSentenceIndex + 1,
        };
      },
      { paragraphTokens: [], totalWords: 0, sentenceIndex: 0 }
    );
  }, [paragraphs]);

  const groupedParagraphs = useMemo(() => paragraphTokens.map(groupBySentence), [paragraphTokens]);

  // Whisper's transcribed word count can drift from our original text (numbers,
  // abbreviations read aloud differently). Word-for-word alignment drifts badly
  // over a long reading, so instead: rescale each sentence's [first, last] word
  // index onto Whisper's index space once, then just track which sentence's
  // start time has most recently passed — far more tolerant of small offsets.
  const sentenceRanges = useMemo(() => {
    const ranges = new Map<number, { start: number; end: number }>();
    if (!timings || !timings.length || totalWords <= 0) return ranges;

    const bounds = new Map<number, { first: number; last: number }>();
    for (const tokens of paragraphTokens) {
      for (const token of tokens) {
        if (token.wordIndex === null || token.sentenceIndex === null) continue;
        const existing = bounds.get(token.sentenceIndex);
        if (!existing) {
          bounds.set(token.sentenceIndex, { first: token.wordIndex, last: token.wordIndex });
        } else {
          existing.last = token.wordIndex;
        }
      }
    }

    const scale = totalWords > 1 && timings.length > 1 ? (timings.length - 1) / (totalWords - 1) : 0;
    const clamp = (i: number) => Math.min(Math.max(i, 0), timings.length - 1);

    for (const [sentenceIndex, { first, last }] of bounds) {
      const whisperFirst = clamp(Math.round(first * scale));
      const whisperLast = clamp(Math.round(last * scale));
      ranges.set(sentenceIndex, {
        start: timings[whisperFirst].start,
        end: timings[Math.max(whisperFirst, whisperLast)].end,
      });
    }
    return ranges;
  }, [timings, paragraphTokens, totalWords]);

  const activeSentenceIndex = useMemo(() => {
    if (!sentenceRanges.size) return -1;
    let active = -1;
    let latestStart = -1;
    for (const [sentenceIndex, range] of sentenceRanges) {
      if (currentTime >= range.start && range.start > latestStart) {
        active = sentenceIndex;
        latestStart = range.start;
      }
    }
    return active;
  }, [sentenceRanges, currentTime]);

  useEffect(() => {
    if (!isPlaying || activeSentenceIndex === -1 || activeSentenceIndex === lastScrolledSentence.current) return;
    lastScrolledSentence.current = activeSentenceIndex;
    activeSentenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSentenceIndex, isPlaying]);

  return (
    <>
      {groupedParagraphs.map((groups, pi) => (
        <p
          key={pi}
          className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-gray-800 text-left sm:text-justify hyphens-none"
          lang="de"
        >
          {groups.map((group, gi) => {
            const isActive = group.sentenceIndex !== null && group.sentenceIndex === activeSentenceIndex;
            return (
              <span
                key={gi}
                ref={isActive ? activeSentenceRef : undefined}
                className={isActive ? "bg-amber-200/80 text-gray-900 rounded transition-colors" : undefined}
              >
                {group.text}
              </span>
            );
          })}
        </p>
      ))}
    </>
  );
}
