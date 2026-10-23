import { ReadingType } from "./types";
import {
  composeSystemPrompt,
  NATURAL_GERMAN_RULES,
  COLLOCATION_RULES,
  buildVocabularyTargetInstruction,
  selfCheckInstruction,
} from "./prompts/shared";
import { TopicItem, STORY_POOL, NEWS_POOL, DIALOGUE_POOL, SPEAKING_POOL } from "./topicPools";
import { selectTopic } from "./topicSelection";

// Renders the optional vocabulary-targeting block, or an empty string when no
// target words were supplied (the common case — only the Notion content
// queue in lib/claude.ts passes this). Kept as one helper so every
// build*Prompt injects it identically.
function vocabularyTargetSection(targetVocabulary?: string[]): string {
  return targetVocabulary && targetVocabulary.length > 0
    ? `\n${buildVocabularyTargetInstruction(targetVocabulary)}\n`
    : "";
}

export type GenerationPrompt = { system: string; user: string };

// grammarChecklist is intentionally NOT part of this template. The generator's
// only job is to write natural German — a separate analysis pass (see
// lib/prompts/analysisPrompt.ts) inspects the finished text afterwards and
// fills the checklist based on what's actually there, so the writer is never
// pulled between "sound natural" and "prove I used Konjunktiv II".
//
// `difficulty` is a parameter (not hardcoded "B1") so every reading type —
// including speaking's A2 — shows the model a schema example with the
// CORRECT difficulty literal. Showing "B1" in the example for an A2 prompt
// risked the model copying it verbatim into the difficulty field itself.
const JSON_TEMPLATE = (readingType: ReadingType, difficulty: "A2" | "B1") => `{
  "title": "",
  "date": "",
  "topic": "",
  "imageKeyword": "",
  "difficulty": "${difficulty}",
  "readingType": "${readingType}",
  "story": "",
  "vocabulary": [
    { "word": "", "meaning": "", "example": "" }
  ],
  "sentencePatterns": [
    { "pattern": "", "meaning": "", "example": "" }
  ],
  "quiz": {
    "questions": [
      {
        "question": "",
        "options": ["", "", "", ""],
        "answer": 0
      }
    ]
  }
}`;

// Short, purpose-built style anchors — NOT taken from the app's dev fallback
// samples. They exist only to demonstrate tone/register; the model is
// explicitly told not to reuse their scenario, characters, or wording.
// Exported so a regression test can confirm golden test fixtures never end
// up duplicated into a production prompt (see tests/prompts/goldenExamples.test.ts).
export const DIALOGUE_STYLE_EXCERPT = `Paul: Ehrlich gesagt, ich hab keinen Bock mehr auf diese Diskussion.
Nora: Ja, ich versteh's ja, aber wir müssen das doch klären, oder?
Paul: Schon, aber nicht jetzt. Ich bin einfach zu müde dafür.
Nora: Na gut. Dann reden wir morgen weiter.`;

export const SPEAKING_STYLE_EXCERPT = `Frau Berg: Guten Tag! Was kann ich für Sie tun?
Herr Klein: Ich hätte gern Informationen zu den Öffnungszeiten.
Frau Berg: Kein Problem. Wir haben von Montag bis Freitag von neun bis achtzehn Uhr geöffnet.
Herr Klein: Super, danke schön!`;

export const STORY_STYLE_EXCERPT = `Nach der Arbeit ging Julia noch schnell einkaufen. An der Kasse merkte sie, dass sie ihr Portemonnaie vergessen hatte. „Oh nein, das gibt's doch nicht", murmelte sie. Die Verkäuferin lächelte. „Kein Problem, Sie können später wiederkommen."`;

export const NEWS_STYLE_EXCERPT = `Laut einer aktuellen Studie ist die Zahl der Fahrgäste im öffentlichen Nahverkehr im letzten Jahr deutlich gestiegen. „Das zeigt, dass sich das Angebot lohnt", sagte ein Sprecher des Verkehrsverbunds.`;

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

// Deterministic zero-knowledge fallback pick, used only when a builder is
// called with neither topicOverride nor a pre-resolved topicItem (direct
// unit-test calls, or any future caller that hasn't wired up
// lib/topicSelection.server.ts). Still seeded/deterministic — never the old
// day-count-modulo rotation, and never Math.random().
function fallbackPick(pool: TopicItem[], type: ReadingType): TopicItem {
  const today = todayIso();
  return selectTopic(pool, `${today}:${type}:v1`, { recentHistory: [], today }).item;
}

// Builds the TOPIC/SCENARIO section shared by news and story: states the
// premise, then — this is the authenticity-critical part — tells the model
// exactly how much latitude it has based on `factuality`. "history" items
// supply verified background facts the model must stick to; "fiction" items
// are explicitly labeled as invented; "verified_fact" sits in between
// (general/structural truths, no specific invented events).
function factualitySection(item: TopicItem): string {
  const lines: string[] = [];

  if (item.factuality === "history") {
    lines.push(
      "FACTUALITY: This is a REAL HISTORICAL EVENT. You may narrate it, dramatize tone and ordinary scene-setting (weather, surroundings, plausible everyday detail), but you must NOT invent additional names, dates, statistics, organizations, or quotations beyond what's given below. If you're unsure whether a specific detail is real, leave it out or keep it general rather than inventing it."
    );
    if (item.verifiedBackground?.length) {
      lines.push("VERIFIED FACTS (use these as your factual anchor — do not contradict or add invented specifics to them):");
      lines.push(item.verifiedBackground.map((f) => `- ${f}`).join("\n"));
    }
  } else if (item.factuality === "verified_fact") {
    lines.push(
      "FACTUALITY: This is a REAL, general-knowledge subject (not a specific invented event). Write it as a true explainer — stick to well-established, structural facts. Do not invent a specific date, named official, or quotation to make it feel like breaking news; if that's not knowable, don't claim it."
    );
    if (item.verifiedBackground?.length) {
      lines.push("BACKGROUND (true, supplied — use it as your anchor, don't contradict it):");
      lines.push(item.verifiedBackground.map((f) => `- ${f}`).join("\n"));
    }
  } else if (item.factuality === "fiction") {
    lines.push(
      "FACTUALITY: This is a FICTIONAL scenario with invented characters and events. Write it with specific, believable, concrete detail — but never present it as something that really happened, and never attribute it to real people, companies, or institutions."
    );
  }

  if (item.format) lines.push(`SUGGESTED FORMAT: ${item.format.replace(/_/g, " ")} — adapt if a different natural structure serves this premise better; this is a steer, not a rigid template.`);
  if (item.centralConflict) lines.push(`CENTRAL TENSION: ${item.centralConflict}`);
  if (item.emotionalTone) lines.push(`TONE: ${item.emotionalTone}`);

  return lines.join("\n");
}

export function buildNewsPrompt(topicOverride?: string, targetVocabulary?: string[], topicItem?: TopicItem): GenerationPrompt {
  const today = todayIso();
  const item = topicOverride ? undefined : topicItem ?? fallbackPick(NEWS_POOL, "news");

  const system = composeSystemPrompt(
    "Right now you are working as a professional German journalist writing clear, accessible explainer articles for B1 language learners — think a well-sourced background piece, not a wire-service breaking-news bulletin."
  );

  const topicSection = topicOverride
    ? `TOPIC FOR TODAY: ${topicOverride}

FACTUALITY: Treat this as a real, general subject. Do NOT invent a specific "today's event," a named official, or a direct quotation to dress it up as breaking news — you have no verified source text for this topic, so write it as an accurate, accessible explainer instead. If you are not confident a specific detail is true, state it generally rather than inventing a specific number, date, or name.`
    : `TOPIC FOR TODAY: ${item!.premise}

${factualitySection(item!)}`;

  const user = `Today's date: ${today}

STYLE REFERENCE (tone only — do not reuse this topic, wording, or names):
"""
${NEWS_STYLE_EXCERPT}
"""

TASK:
Write one accessible German B1-level journalistic explainer article (Hintergrundbericht) about the topic below. This is background/explainer journalism, not a report of a specific invented news event — the goal is to teach the reader something true and genuinely interesting, in clear B1 German.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

${topicSection}

ARTICLE REQUIREMENTS:
- Give the article a clear, engaging headline (title) — journalistic in tone, not a dry textbook heading.
- Style: factual, clear, and journalistic, but structured as an explainer, not a breaking-news report. Short, clear sentences. B1 vocabulary. Real institution/role names are fine in general terms (Bundesministerium, Krankenkasse, Bundesliga) — do not invent a specific named individual, quotation, or precise statistic you aren't given above.
- 300–370 words total.
- Structure: an engaging opening that states clearly what this is about and why it matters, context/background, how it actually works or what's genuinely at stake, a brief, honest note on debate or trade-offs if the topic has one, and a short closing thought.
- Do NOT invent direct quotations attributed to a named real-sounding official, spokesperson, or expert. If illustrative commentary genuinely helps the piece, phrase it generically and impersonally (e.g., "Kritiker weisen oft darauf hin, dass ...", "Befürworter argumentieren, dass ...") without inventing a specific named source.
- This genre often draws on Passiv, Nebensätze mit "dass/weil/obwohl", Modalverben, and Konjunktiv II for reported/hedged claims — use them where real journalism naturally would.
- Do NOT write about Mietpreise, Deutschlandticket, or recycling — these have been covered repeatedly; pick something that actually teaches the reader something new.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}
${vocabularyTargetSection(targetVocabulary)}
VOCABULARY:
- 8–12 useful words or phrases from the article.
- Include German word/phrase, English meaning, and a German example sentence.

SENTENCE PATTERNS:
- 4–6 sentence patterns from the article useful for B1 writing.

QUIZ — Multiple Choice:
- Exactly 4 questions testing reading comprehension.
- Each question has exactly 4 answer options.
- Exactly one option is correct. The others are plausible but wrong based on the text.
- "answer" is the 0-based index of the correct option (0 = first, 1 = second, 2 = third, 3 = fourth).

Return this exact JSON structure:

${JSON_TEMPLATE("news", "B1")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildDialoguePrompt(topicOverride?: string, targetVocabulary?: string[], topicItem?: TopicItem): GenerationPrompt {
  const item = topicOverride ? undefined : topicItem ?? fallbackPick(DIALOGUE_POOL, "dialogue");
  const pick = topicOverride ?? item!.premise;
  const purposeLine = !topicOverride && item?.purpose ? `\nCOMMUNICATIVE PURPOSE: ${item.purpose}` : "";
  const toneLine = !topicOverride && item?.emotionalTone ? `\nTONE: ${item.emotionalTone}` : "";
  const conflictLine = !topicOverride && item?.centralConflict ? `\nCENTRAL TENSION: ${item.centralConflict}` : "";

  const system = composeSystemPrompt(
    "Right now you are working as a German B1 exam teacher and dialogue writer, creating a natural two-person conversation for reading and speaking practice."
  );

  const user = `STYLE REFERENCE (tone only — do not reuse this scenario, these characters, or this wording):
"""
${DIALOGUE_STYLE_EXCERPT}
"""

TASK:
Create a long, natural German B1-level dialogue (Gespräch) between two people for reading and speaking practice.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

SCENARIO FOR TODAY: ${pick}${purposeLine}${conflictLine}${toneLine}

CONTENT REQUIREMENTS:
- Two characters with realistic German first names that fit the scenario.
- 400–480 words total — this should be a substantial dialogue, not a short exchange.
- Format each speaker line as: "Name: text" on its own line, separated by a blank line.
- Make it feel completely real: include interruptions, disagreements, misunderstandings, clarifications, and emotions.
- The characters should have different opinions or goals — create real tension or negotiation, not just an exchange of pleasantries.
- Include moments of humour, awkwardness, or surprise to keep it engaging.
- End with 2–3 narrator sentences describing the outcome.
- At least 75% of the text must be direct dialogue (not narration).
- This level draws on: Perfekt for past, Konjunktiv II for suggestions/wishes, Modalverben, Nebensätze mit "weil/dass/wenn/obwohl". Reserve Passiv and Relativsätze for the narrator lines, not the spoken lines, and only where they'd occur naturally there too.
- Set the scene in a specific German city or region — NOT always Berlin. Rotate between cities like Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, Leipzig, Düsseldorf.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}
${vocabularyTargetSection(targetVocabulary)}
VOCABULARY:
- 10–14 useful words or expressions from the dialogue.
- Include German word/phrase, English meaning, and a German example sentence.

SENTENCE PATTERNS:
- 5–7 useful conversational sentence patterns from the dialogue.

QUIZ — Multiple Choice:
- Exactly 4 questions testing comprehension of the dialogue.
- Each question has exactly 4 answer options.
- Exactly one option is correct.
- "answer" is the 0-based index of the correct option.

Return this exact JSON structure:

${JSON_TEMPLATE("dialogue", "B1")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildStoryPrompt(topicOverride?: string, targetVocabulary?: string[], topicItem?: TopicItem): GenerationPrompt {
  const item = topicOverride ? undefined : topicItem ?? fallbackPick(STORY_POOL, "story");

  const system = composeSystemPrompt(
    "Right now you are working as a German B1 editor and storyteller who writes genuinely interesting reading-practice pieces — the kind someone would enjoy even if they weren't studying German. Some are true (history, curious real facts, human-interest), some are fiction; you always make clear, implicitly through how the piece is written, which one this is."
  );

  const topicSection = topicOverride
    ? `PREMISE FOR TODAY:\n${topicOverride}\n\nFACTUALITY: Unless the premise above is clearly describing a well-known real event, treat this as a fictional scenario — invented but believable, never presented as a verified true account.`
    : `PREMISE FOR TODAY:\n${item!.premise}\n\n${factualitySection(item!)}`;

  const user = `STYLE REFERENCE (tone only — do not reuse this scenario, these characters, or this wording):
"""
${STORY_STYLE_EXCERPT}
"""

TASK:
Write one genuinely engaging German B1-level reading-practice piece based on the premise below.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

${topicSection}

STORY REQUIREMENTS:
- 350–420 words.
- Use natural, modern German — not robotic or overly formal. Use mostly A2–B1 vocabulary with a few useful new words introduced naturally.
- OPENING: start with whatever makes this premise interesting — a surprising fact, an unusual situation, a question, a decision point, or a conflict already in motion. Avoid generic openings like someone simply waking up, starting an ordinary commute, or describing a routine day, unless that ordinariness is itself about to be disrupted within the first sentence or two.
- Give the reader concrete, memorable, specific details (a place, a number, an object, a name) rather than filler sentences added just to reach the word count.
- Vary the structure to fit the premise — not every piece needs a problem, a conversation, and a tidy happy ending. A historical account can read like a short reconstruction; a curious-fact piece can read like a lively explainer; a dilemma can end without a clean resolution.
- The ending should fit the piece: surprising, reflective, funny, open-ended, or simply informative, as the subject calls for — avoid a generic moral lesson or predictable feel-good wrap-up unless the premise genuinely earns it.
- Use dialogue only where it genuinely serves the piece (a scene between people). Do not force dialogue into a historical account or factual explainer that doesn't naturally have any — when dialogue is absent, narration and scene-setting alone are completely fine.
- This level draws on: Präsens, Perfekt, Modalverben, Nebensätze, Relativsätze, Konjunktiv II, and Passiv — use whichever of these actually occur naturally in the piece, never all of them forced into every paragraph, and never a construction included just to tick a grammar box.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}
${vocabularyTargetSection(targetVocabulary)}
VOCABULARY:
- 10–14 useful words from the piece.
- Include German word, English meaning, and a German example sentence.

SENTENCE PATTERNS:
- 5–8 sentence patterns from the piece useful for B1 writing.

QUIZ — Multiple Choice:
- Exactly 5 questions testing reading comprehension of the piece.
- Each question has exactly 4 answer options.
- Exactly one option is correct. The others are plausible but clearly wrong based on the piece.
- "answer" is the 0-based index of the correct option (0 = first, 1 = second, 2 = third, 3 = fourth).

Return this exact JSON structure:

${JSON_TEMPLATE("story", "B1")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildSpeakingPrompt(topicOverride?: string, targetVocabulary?: string[], topicItem?: TopicItem): GenerationPrompt {
  const item = topicOverride ? undefined : topicItem ?? fallbackPick(SPEAKING_POOL, "speaking");
  const pick = topicOverride ?? item!.premise;
  const purposeLine = !topicOverride && item?.purpose ? `\nCOMMUNICATIVE PURPOSE: ${item.purpose} — make sure the dialogue clearly accomplishes this, not just generic small talk in this setting.` : "";

  const system = composeSystemPrompt(
    "Right now you are working as a friendly German A2 language teacher helping a learner improve their spoken German by writing a natural, readable-aloud dialogue."
  );

  const user = `STYLE REFERENCE (tone only — do not reuse this scenario, these characters, or this wording):
"""
${SPEAKING_STYLE_EXCERPT}
"""

TASK:
Create a natural A2-level dialogue between two people that a learner can read aloud to practise speaking German.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

SCENARIO FOR TODAY: ${pick}${purposeLine}

CONTENT REQUIREMENTS:
- Two characters with names that fit the scenario — give them different personalities.
- 260–310 words total — long enough to be a real conversation, short enough to read aloud in 2–3 minutes.
- Format each line as: "Name: text" on its own line, separated by a blank line.
- Use ONLY A1–A2 vocabulary and grammar: Präsens, simple Perfekt with haben/sein, modal verbs (können, möchten, müssen, dürfen), simple questions and answers, and basic Konjunktiv II (könnte, würde, hätte) where it naturally fits.
- Sentences: clear and short — maximum 12 words per sentence.
- Give the scenario a specific, concrete reason for the conversation and a natural outcome by the end — not just atmosphere.
- Make it feel genuine — include natural small talk, hesitation, and politeness markers that fit THIS specific scene. Vary which discourse markers and polite phrases you reach for across different dialogues (see the NATURALNESS RULES below for the shared pool) rather than defaulting to the same few words every time — a dialogue about a pet should not sound like one about train directions.
- Let the scenario genuinely drive the vocabulary: pull words from whatever domain the scene actually calls for (food, family, weather, chores, hobbies, transport, shopping, health, etc.) instead of generic filler.
- Set the scene in a specific real German place — a city, a neighbourhood, a type of shop or location. NOT always Berlin. Use Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, etc.
- After the dialogue, add 2 short sentences of narrator text describing the outcome.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}
${vocabularyTargetSection(targetVocabulary)}
VOCABULARY:
- 6–9 key words or phrases from the dialogue, useful for A2 learners.
- Include German word/phrase, English meaning, and a simple German example sentence.

QUIZ — Multiple Choice:
- Exactly 3 questions testing comprehension of the dialogue.
- Each question has exactly 4 answer options.
- Exactly one option is correct.
- "answer" is the 0-based index of the correct option.

SENTENCE PATTERNS:
- 4–5 simple, useful sentence patterns from the dialogue for everyday speaking.

Return this exact JSON structure:

${JSON_TEMPLATE("speaking", "A2")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildPromptForType(
  type: ReadingType,
  topicOverride?: string,
  targetVocabulary?: string[],
  topicItem?: TopicItem
): GenerationPrompt {
  switch (type) {
    case "news":     return buildNewsPrompt(topicOverride, targetVocabulary, topicItem);
    case "dialogue": return buildDialoguePrompt(topicOverride, targetVocabulary, topicItem);
    case "story":    return buildStoryPrompt(topicOverride, targetVocabulary, topicItem);
    case "speaking": return buildSpeakingPrompt(topicOverride, targetVocabulary, topicItem);
  }
}
