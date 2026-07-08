"use client";

import { useRef, useState } from "react";
import { PronunciationClip } from "@/lib/pronounceCache.server";
import PronunciationResults from "@/components/PronunciationResults";
import TatoebaAudioPlayer from "@/components/TatoebaAudioPlayer";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

type Props = {
  compact?: boolean;
};

export default function PronounceSearch({ compact = false }: Props) {
  const [input, setInput] = useState("");
  const [word, setWord] = useState<string | null>(null);
  const [clips, setClips] = useState<PronunciationClip[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (trimmed === word && streaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setWord(trimmed);
    setLoading(true);
    setStreaming(true);
    setError(null);
    setClips([]);
    setSelectedIndex(0);

    try {
      const res = await fetch(`/api/pronounce?word=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to fetch pronunciation clips");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const consumeLine = (line: string) => {
        if (!line.trim() || controller.signal.aborted) return;
        const clip = JSON.parse(line) as PronunciationClip;
        setClips((prev) => (prev.some((c) => c.sentenceId === clip.sentenceId) ? prev : [...prev, clip]));
        setLoading(false);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consumeLine);
      }
      consumeLine(buffer);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setStreaming(false);
      }
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(input);
        }}
        className={`flex gap-2 ${compact ? "mb-4" : "mb-8"}`}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Quittung"
          className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
        >
          Search
        </button>
      </form>

      {loading && <LoadingState message="Searching for spoken examples…" />}

      {!loading && error && <ErrorState message={error} onRetry={() => word && search(word)} />}

      {!loading && !streaming && !error && word && clips.length === 0 && (
        <div className={`text-center border border-dashed border-gray-200 rounded-2xl ${compact ? "py-8" : "py-16"}`}>
          <p className="text-gray-400 text-sm">No spoken examples found for &quot;{word}&quot;.</p>
        </div>
      )}

      {!loading && !error && clips.length > 0 && (
        <div className="flex flex-col gap-4">
          <TatoebaAudioPlayer clip={clips[selectedIndex]} />
          <PronunciationResults
            word={word ?? ""}
            clips={clips}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
          {streaming && <p className="text-center text-xs text-gray-300">Loading more examples…</p>}
        </div>
      )}
    </div>
  );
}
