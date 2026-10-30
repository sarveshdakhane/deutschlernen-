function speakWord(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  const voices = window.speechSynthesis.getVoices();
  const german = voices.find((v) => v.lang.toLowerCase().startsWith("de"));
  utterance.voice = german ?? null;
  utterance.lang = german?.lang ?? "de-DE";
  utterance.rate = 0.85; // slightly slower for a single word's clarity
  window.speechSynthesis.speak(utterance);
}

// Splits on whitespace while keeping the whitespace itself as separate
// tokens, so clickable word spans don't collapse the original spacing.
function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

type Props = {
  paragraphs: string[];
};

export default function StoryParagraphs({ paragraphs }: Props) {
  return (
    <>
      {paragraphs.map((text, i) => (
        <p
          key={i}
          className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-slate-200 text-left sm:text-justify hyphens-none"
          lang="de"
        >
          {tokenize(text).map((token, j) =>
            /^\s+$/.test(token) ? (
              token
            ) : (
              <button
                key={j}
                type="button"
                onClick={() => speakWord(token)}
                className="inline bg-transparent border-0 p-0 m-0 [font:inherit] text-inherit align-baseline cursor-pointer rounded hover:bg-blue-500/20 hover:text-blue-200 active:bg-blue-500/30 transition-colors"
              >
                {token}
              </button>
            )
          )}
        </p>
      ))}
    </>
  );
}
