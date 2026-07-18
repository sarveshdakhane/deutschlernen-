export type VocabularyItem = {
  word: string;
  meaning: string;
  example: string;
};

export type SentencePattern = {
  pattern: string;
  meaning: string;
  example: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
};

export type PrepositionQuestion = {
  // Full sentence with the blank marked as "___".
  sentence: string;
  // Exactly 4 preposition options.
  options: string[];
  // 0-based index of the correct option.
  answer: number;
  // English translation of the completed (correct) sentence.
  translation: string;
};

export type ReadingType = "news" | "dialogue" | "story" | "speaking";

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

// Pipeline provenance for a generated artifact — which prompt version and
// models produced it, and when. Purely for debugging (e.g. correlating a
// quality regression with a prompt or model change); no UI reads this.
// Deliberately excludes quality scores — see QualityScore below, which is
// never attached to a Story and only ever flows through server-side logs.
export type PipelineMeta = {
  promptVersion: string;
  generationModel: string;
  reviewModel: string;
  analysisModel: string;
  generationTemperature: number;
  reviewTemperature: number;
  analysisTemperature: number;
  generatedAt: string;
};

// Structured quality signal produced by the review stage. Internal only —
// never serialized onto a Story or returned by the API; it only flows into
// server logs (via lib/promptDebugLog.server.ts) and prompt regression
// tests. Every field is 0.0-1.0 except translationInterference, which is
// inverted (0.0 = no interference detected, 1.0 = heavy).
export type QualityScore = {
  grammar: number;
  naturalness: number;
  idiomaticity: number;
  pragmatics: number;
  register: number;
  cefrConsistency: number;
  translationInterference: number;
  confidence: number;
};

export type Story = {
  slug: string;
  title: string;
  date: string;
  topic: string;
  difficulty: "B1" | "A2";
  imageKeyword?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioTimingsUrl?: string;
  readingType: ReadingType;
  story: string;
  grammarChecklist: {
    praesens: boolean;
    perfekt: boolean;
    modalverben: boolean;
    nebensaetze: boolean;
    relativsaetze: boolean;
    konjunktivII: boolean;
    passiv: boolean;
  };
  vocabulary: VocabularyItem[];
  sentencePatterns: SentencePattern[];
  quiz: {
    questions: QuizQuestion[];
  };
  meta?: PipelineMeta;
};
