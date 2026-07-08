import { PronunciationClip } from "@/lib/pronounceCache.server";

type Props = {
  clip: PronunciationClip;
};

export default function TatoebaAudioPlayer({ clip }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-lg text-gray-900 leading-relaxed mb-1">{clip.text}</p>
      {clip.translation && <p className="text-sm text-gray-400 mb-4">{clip.translation}</p>}
      <audio key={clip.sentenceId} controls autoPlay src={clip.audioUrl} className="w-full">
        Your browser does not support the audio element.
      </audio>
      <p className="text-xs text-gray-300 mt-3">Sentence &amp; audio via tatoeba.org</p>
    </div>
  );
}
