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

export type Story = {
  slug: string;
  title: string;
  date: string;
  topic: string;
  difficulty: "B1";
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
    readingQuestions: string[];
    writingPrompts: string[];
  };
};
