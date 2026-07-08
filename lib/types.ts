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

export type ReadingType = "news" | "dialogue" | "story" | "speaking";

export type WordTiming = {
  word: string;
  start: number;
  end: number;
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
};
