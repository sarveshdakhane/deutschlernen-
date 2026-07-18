// Optional vocabulary-analyzer stage (see pipeline diagram in
// docs/prompt-architecture.md). Off by default — gated by
// ENABLE_VOCABULARY_ANALYSIS in lib/aiConfig.server.ts. Its only job is to
// flag vocabulary items that don't actually match the stated CEFR level; it
// does not generate, edit, or rewrite anything.

import { VocabularyItem } from "../types";

export function buildVocabularySystemPrompt(): string {
  return `You are a CEFR vocabulary difficulty analyst for German language-learning content. Your only job is to check whether a vocabulary list matches its stated CEFR level — you do not generate or edit content, and you do not judge anything other than difficulty fit.`;
}

export function buildVocabularyUserPrompt(
  vocabulary: VocabularyItem[],
  difficulty: "A2" | "B1"
): string {
  const list = vocabulary.map((v) => `- ${v.word}: ${v.meaning} (example: ${v.example})`).join("\n");

  return `Review this vocabulary list, extracted from a German ${difficulty} reading:
"""
${list}
"""

For each word, judge whether it is a reasonable ${difficulty} vocabulary item — not clearly above the level (too advanced/rare for a learner at this stage) and not so basic it teaches nothing new.

Return valid JSON only, in this exact structure, with no markdown and no explanation outside the JSON:
{
  "appropriate": true,
  "flagged": []
}
"appropriate" is true only if every word fits ${difficulty} reasonably well. "flagged" lists the exact word/phrase (as written above) for any item that is clearly too advanced or too basic for ${difficulty} — an empty array if none.`;
}
