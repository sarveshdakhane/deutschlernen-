// Second-pass "native speaker editor" prompt. Runs after generation and
// only fixes sentences that sound wrong — it never rewrites content that
// already sounds natural. It also grades the text it reviewed, so the
// pipeline has a structured signal of quality beyond "did JSON parse".

import { ReadingType } from "../types";
import { composeSystemPrompt, NATURAL_GERMAN_RULES, COLLOCATION_RULES } from "./shared";

export function buildReviewSystemPrompt(): string {
  return composeSystemPrompt(
    `Right now your job is ONLY to edit and grade, not to write. You are a native-speaker copy editor reviewing German text that another writer already produced. You do not rewrite the piece — you fix only what actually sounds wrong to a native ear, and you leave everything else untouched.

A sentence can fail in different, independent ways — always judge each one separately, not as a single pass/fail:
- Grammatically correct: is it free of case, agreement, word-order, and conjugation errors?
- Idiomatic: does it use the fixed expressions and collocations a native speaker actually uses, even though a literal alternative would also be grammatically valid?
- Natural: does it sound like something a real person would say/write, as opposed to a technically-fine sentence nobody would actually produce?
- Frequent: is this the phrasing you'd expect to see most often in real native usage, or a rarer/more marked alternative?
- Appropriate register: does the formality level match the scenario (casual speech vs. journalistic writing vs. polite service interaction, etc.)?

A sentence can be 100% grammatically correct and still fail on naturalness, frequency, or register — always prefer the expression a native speaker would actually say over one that is merely grammatically acceptable.`
  );
}

// story/news get four extra editorial dimensions on top of the shared
// eight — reusing this same review call rather than a dedicated 5th Claude
// call, since the reviewer already reads the full text closely. Gated by
// type: a scripted dialogue/speaking exchange has no real "curiosity hook"
// or "factual integrity" to assess the way a story/news piece does.
const CONTENT_QUALITY_TYPES: ReadingType[] = ["story", "news"];

function contentQualityInstructions(type: ReadingType): string {
  if (!CONTENT_QUALITY_TYPES.includes(type)) return "";
  return `
Also grade these four dimensions, specific to ${type} content, 0.0–1.0:
- curiosity: does the opening give the reader a genuine reason to keep reading (a hook, a question, a surprise), as opposed to a flat, generic start?
- specificity: does the piece contain concrete, memorable, specific details rather than generic filler?
- coherence: do the events, motivations, and ending actually make sense together?
- factualIntegrity: if the piece presents itself as true (history/real event/explainer), is every specific claim plausibly supported by what a careful, honest writer would actually know — i.e. no invented names, dates, statistics, or quotations presented as fact? Score 1.0 if the piece is clearly fictional and never claims to be true (factual integrity isn't being tested), or if it's factual and makes no unsupported specific claims. Score low if it's presented as real but contains invented specifics that read as fabricated facts.`;
}

function contentQualitySchema(type: ReadingType): string {
  if (!CONTENT_QUALITY_TYPES.includes(type)) return "";
  return `,
    "curiosity": 0.0,
    "specificity": 0.0,
    "coherence": 0.0,
    "factualIntegrity": 0.0`;
}

export function buildReviewUserPrompt(
  text: string,
  type: ReadingType,
  difficulty: "A2" | "B1"
): string {
  return `${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}

TASK:
Review the following German ${difficulty}-level ${type} text sentence by sentence. Fix ONLY:
- unnatural or awkward German
- incorrect or unnatural collocations
- grammar mistakes
- translationese (literal English-influenced phrasing)
- pragmatic mistakes (a native speaker would never ask or respond that way in this context)
- unnatural register for the scenario

Do NOT rewrite sentences that already sound natural. Do NOT change the plot, the characters, the outcome, or the overall meaning. Do NOT change the CEFR difficulty level or introduce harder vocabulary/grammar than what is already there — keep corrections at the same level. Preserve the exact structure of the input: if lines are formatted as "Name: text" separated by blank lines, keep that exact format — only edit the wording inside a line, never merge, remove, add, or reorder lines or paragraphs.

If the text is already fully natural, return it completely unchanged.

TEXT TO REVIEW:
"""
${text}
"""

After editing, grade the FINAL (post-edit) text you are returning on each dimension below, from 0.0 (fails badly) to 1.0 (flawless), based on what actually remains in your edited version:
- grammar: freedom from case/agreement/word-order/conjugation errors
- naturalness: would an educated native speaker actually say/write this
- idiomaticity: correct use of fixed expressions and collocations
- pragmatics: contextually appropriate questions/responses/turn-taking
- register: formality level matches the scenario
- cefrConsistency: vocabulary and grammar complexity match the stated ${difficulty} level
- translationInterference: 0.0 = no English-influenced phrasing detected, 1.0 = heavy literal-translation feel (this one is inverted — lower is better)
- confidence: how confident you are in these scores given the length and complexity of the text
${contentQualityInstructions(type)}

Return valid JSON only, in this exact structure, with no markdown and no explanation outside the JSON:
{
  "text": "<the reviewed text, with the same line/paragraph structure as the input>",
  "qualityScore": {
    "grammar": 0.0,
    "naturalness": 0.0,
    "idiomaticity": 0.0,
    "pragmatics": 0.0,
    "register": 0.0,
    "cefrConsistency": 0.0,
    "translationInterference": 0.0,
    "confidence": 0.0${contentQualitySchema(type)}
  }
}`;
}
