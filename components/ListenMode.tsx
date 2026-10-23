"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  paragraphs: string[];
  hideText: boolean;
  onToggleHideText: () => void;
};

type Status = "idle" | "playing" | "paused";

export default function ListenMode({ paragraphs, hideText, onToggleHideText }: Props) {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(0.9);
  const [status, setStatus] = useState<Status>("idle");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!supported) return;

    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      const german = all.filter((v) => v.lang.toLowerCase().startsWith("de"));
      const list = german.length > 0 ? german : all;
      setVoices(list);
      setVoiceURI((current) => current || list[0]?.voiceURI || "");
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Stop speaking if the user navigates away mid-playback — otherwise a
    // German utterance keeps talking over whatever page they land on next.
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  function speakFrom(start: number) {
    const voice = voices.find((v) => v.voiceURI === voiceURI);

    function speakNext(i: number) {
      if (i >= paragraphs.length) {
        setStatus("idle");
        indexRef.current = 0;
        return;
      }
      indexRef.current = i;
      const utterance = new SpeechSynthesisUtterance(paragraphs[i]);
      utterance.lang = voice?.lang ?? "de-DE";
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onend = () => speakNext(i + 1);
      utterance.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(utterance);
    }

    speakNext(start);
  }

  function handlePlay() {
    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    window.speechSynthesis.cancel();
    setStatus("playing");
    speakFrom(0);
  }

  function handlePause() {
    window.speechSynthesis.pause();
    setStatus("paused");
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    indexRef.current = 0;
    setStatus("idle");
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500 print:hidden">
        Listening mode isn&apos;t supported in this browser.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4 sm:px-5 sm:py-4 mb-4 sm:mb-6 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
          🎧 Hören
        </h2>

        <div className="flex items-center gap-2">
          {status !== "playing" && (
            <button
              onClick={handlePlay}
              className="px-3 py-1.5 bg-slate-100 text-slate-900 text-sm font-medium rounded-lg hover:bg-white transition-colors"
            >
              {status === "paused" ? "▶ Weiter" : "▶ Vorlesen"}
            </button>
          )}
          {status === "playing" && (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 bg-slate-700 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          {status !== "idle" && (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 bg-slate-700 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
            >
              ⏹ Stop
            </button>
          )}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Tempo
          <select
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
          >
            <option value={0.75}>Langsam</option>
            <option value={0.9}>Normal</option>
            <option value={1.1}>Schnell</option>
          </select>
        </label>

        {voices.length > 1 && (
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Stimme
            <select
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 max-w-[140px]"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto cursor-pointer">
          <input type="checkbox" checked={hideText} onChange={onToggleHideText} className="accent-blue-400" />
          Text verstecken
        </label>
      </div>
    </div>
  );
}
