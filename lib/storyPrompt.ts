import { ReadingType } from "./types";
import {
  composeSystemPrompt,
  NATURAL_GERMAN_RULES,
  COLLOCATION_RULES,
  selfCheckInstruction,
} from "./prompts/shared";

export type GenerationPrompt = { system: string; user: string };

// grammarChecklist is intentionally NOT part of this template. The generator's
// only job is to write natural German — a separate analysis pass (see
// lib/prompts/analysisPrompt.ts) inspects the finished text afterwards and
// fills the checklist based on what's actually there, so the writer is never
// pulled between "sound natural" and "prove I used Konjunktiv II".
const JSON_TEMPLATE = (readingType: ReadingType) => `{
  "title": "",
  "date": "",
  "topic": "",
  "imageKeyword": "",
  "difficulty": "B1",
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

export function buildNewsPrompt(topicOverride?: string): GenerationPrompt {
  const today = new Date().toISOString().split("T")[0];
  const categories = [
    "German federal politics (Bundestag, Koalition, new laws, party decisions, chancellor/ministers)",
    "German economy (DAX, inflation, energy prices, major companies, jobs, trade, Mindestlohn)",
    "Climate and environment in Germany (Energiewende, flooding, drought, CO2 targets, renewables)",
    "German society and migration (Asylpolitik, integration, demographic change, housing shortage)",
    "European Union and Germany's role (EU policy, elections, Germany's EU presidency, Euro)",
    "German health system (Krankenversicherung reform, hospitals, new medical research, drug costs)",
    "German education and youth (Schulreform, Abitur, apprenticeships, university, digital schools)",
    "German sports (Bundesliga, national football team, Olympics, major German sporting events)",
    "Technology and digital Germany (AI policy, digitalization, cybersecurity, Deutsche Bahn, Tesla Gigafactory)",
    "German culture and society (film festivals, museums, Oktoberfest, public holidays, social trends)",
  ];
  const pick = topicOverride ?? categories[Math.floor((new Date(today).getTime() / 86400000) % categories.length)];

  const system = composeSystemPrompt(
    "Right now you are working as a professional German news journalist writing Tagesschau/Der-Spiegel-style articles for B1 language learners."
  );

  const user = `Today's date: ${today}

STYLE REFERENCE (tone only — do not reuse this topic, wording, or names):
"""
${NEWS_STYLE_EXCERPT}
"""

TASK:
Write one realistic German B1-level news article (Nachrichtenartikel) in the style of Tagesschau or Der Spiegel, but using accessible B1 German.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

TOPIC CATEGORY FOR TODAY: ${pick}

ARTICLE REQUIREMENTS:
- Write about a specific, realistic news event or development in the chosen category — something that could plausibly be a top news story in Germany around ${today}.
- Give the article a proper journalistic headline (title) that sounds like a real German news headline.
- Style: factual and journalistic. Short, clear sentences. B1 vocabulary. Real places, institutions, and job titles (Bundesministerium, Sprecher, Bürgermeisterin, etc.).
- 300–370 words total.
- Structure: lead paragraph (who/what/where/when), background, expert or official quote, outlook.
- Include at least one direct quote with attribution (e.g., "Bundesminister Müller sagte: ...").
- This genre often draws on Passiv, Nebensätze mit "dass/weil/obwohl", Modalverben, and Konjunktiv II for reported speech — use them where real journalism would.
- Do NOT write about Mietpreise, Deutschlandticket, or recycling — pick something more substantive from the category above.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}

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

${JSON_TEMPLATE("news")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildDialoguePrompt(topicOverride?: string): GenerationPrompt {
  const today = new Date().toISOString().split("T")[0];
  const topics = [
    "two colleagues arguing (politely) about how to handle a difficult customer at work",
    "flatmates negotiating new house rules after one of them gets a dog",
    "two friends planning a road trip across Germany — disagreeing on the route and budget",
    "a person calling their insurance company about a rejected claim",
    "two students discussing whether to change their university major",
    "a job applicant and a friend doing a mock interview to prepare",
    "two neighbours dealing with a noise complaint and trying to find a solution",
    "siblings planning their parents' surprise anniversary party and disagreeing on details",
    "two friends debating whether to move to a new city for work",
    "a person trying to explain a complicated situation to their landlord",
    "two colleagues planning an office Christmas party with very different ideas",
    "two friends — one vegan, one not — cooking together and negotiating the menu",
    "a person and their doctor discussing a lifestyle change and the patient's resistance",
    "two friends debating whether social media is good or bad, using personal examples",
    "a parent and adult child discussing whether the child should move back home to save money",
    "two colleagues, one working from home and one in-office, complaining to each other",
    "two strangers stuck together at a delayed train station passing the time",
    "a person negotiating a pay rise with their manager",
    "two friends who haven't seen each other in a year catching up over dinner",
    "a couple deciding between adopting a pet and the complications that come with it",
  ];
  const pick = topicOverride ?? topics[Math.floor((new Date(today).getTime() / 86400000) % topics.length)];

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

SCENARIO FOR TODAY: ${pick}

CONTENT REQUIREMENTS:
- Two characters with realistic German first names that fit the scenario.
- 400–480 words total — this should be a substantial dialogue, not a short exchange.
- Format each speaker line as: "Name: text" on its own line, separated by a blank line.
- Make it feel completely real: include interruptions, disagreements, misunderstandings, clarifications, and emotions.
- The characters should have different opinions or goals — create real tension or negotiation.
- Include moments of humour, awkwardness, or surprise to keep it engaging.
- End with 2–3 narrator sentences describing the outcome.
- At least 75% of the text must be direct dialogue (not narration).
- This level draws on: Perfekt for past, Konjunktiv II for suggestions/wishes, Modalverben, Nebensätze mit "weil/dass/wenn/obwohl". Reserve Passiv and Relativsätze for the narrator lines, not the spoken lines, and only where they'd occur naturally there too.
- Set the scene in a specific German city or region — NOT always Berlin. Rotate between cities like Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, Leipzig, Düsseldorf.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}

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

${JSON_TEMPLATE("dialogue")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildStoryPrompt(topicOverride?: string): GenerationPrompt {
  const system = composeSystemPrompt(
    "Right now you are working as a German B1 exam teacher, writing a short story for reading practice."
  );

  const topicSection = topicOverride
    ? `TOPIC:\nWrite about this specific topic: ${topicOverride}.`
    : `TOPIC:\nChoose one realistic B1 topic (vary it — avoid repeating the same topics): work problems, friendships, family situations, doctor visits, online shopping, restaurant situations, language learning, workplace communication, neighbour problems, technology issues, social media misunderstandings, hobbies, stress and motivation, teamwork, customer service, planning events, cultural misunderstandings, job interviews, daily life in Germany.`;

  const user = `STYLE REFERENCE (tone only — do not reuse this scenario, these characters, or this wording):
"""
${STORY_STYLE_EXCERPT}
"""

TASK:
Create one realistic German B1-level short story for reading practice.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

${topicSection}

STORY REQUIREMENTS:
- 350–420 words.
- Use natural, modern German — not robotic or overly formal.
- Use mostly A2–B1 vocabulary with a few useful new words introduced naturally.
- Mix narration and dialogue. At least 35% of the story must be dialogue.
- Dialogues must sound realistic and useful for speaking practice.
- Include emotions, opinions, reactions, and everyday communication.
- Write in a style similar to Goethe/TELC B1 reading texts, but more engaging and conversational.
- This level draws on: Präsens, Perfekt, Modalverben, Nebensätze, Relativsätze, Konjunktiv II, and Passiv — use whichever of these actually occur naturally in the narration and dialogue, not all of them forced into every paragraph.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}

VOCABULARY:
- 10–14 useful words from the story.
- Include German word, English meaning, and a German example sentence.

SENTENCE PATTERNS:
- 5–8 sentence patterns from the story useful for B1 writing.

QUIZ — Multiple Choice:
- Exactly 5 questions testing reading comprehension of the story.
- Each question has exactly 4 answer options.
- Exactly one option is correct. The others are plausible but clearly wrong based on the story.
- "answer" is the 0-based index of the correct option (0 = first, 1 = second, 2 = third, 3 = fourth).

Return this exact JSON structure:

${JSON_TEMPLATE("story")}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildSpeakingPrompt(topicOverride?: string): GenerationPrompt {
  const today = new Date().toISOString().split("T")[0];
  const scenarios = [
    "two friends making plans to go hiking — one is very enthusiastic, the other hesitant",
    "a customer returning a broken item to a shop and the shop assistant trying to help",
    "two people at a supermarket checkout — one forgot their wallet, the other offers to help",
    "a tourist asking a local for directions to the nearest train station",
    "someone calling a doctor's office to book an urgent appointment",
    "two friends arguing (nicely) about which film to watch tonight",
    "a person asking a neighbour to water their plants while they're on holiday",
    "a student asking a teacher for help understanding a homework assignment",
    "two people meeting for the first time at a language exchange event",
    "a person at a bakery struggling to explain what they want (it's their first time)",
    "two colleagues deciding where to go for lunch and having different preferences",
    "someone calling a hotel to ask about available rooms and prices",
    "a person at a pharmacy asking for medicine and the pharmacist asking follow-up questions",
    "two friends at a flea market — one wants to buy something, the other tries to bargain",
    "someone asking a bus driver whether this bus stops near the city park",
    "two people in a waiting room chatting about why they are both there",
    "a person asking in a café whether the food is vegetarian",
    "two friends discussing their favourite German word or phrase they have learnt",
    "someone asking a colleague to explain how the coffee machine works",
    "a person calling a sports centre to ask about membership prices and opening times",
  ];
  const pick = topicOverride ?? scenarios[Math.floor((new Date(today).getTime() / 86400000) % scenarios.length)];

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

SCENARIO FOR TODAY: ${pick}

CONTENT REQUIREMENTS:
- Two characters with names that fit the scenario — give them different personalities.
- 260–310 words total — long enough to be a real conversation, short enough to read aloud in 2–3 minutes.
- Format each line as: "Name: text" on its own line, separated by a blank line.
- Use ONLY A1–A2 vocabulary and grammar: Präsens, simple Perfekt with haben/sein, modal verbs (können, möchten, müssen, dürfen), simple questions and answers, and basic Konjunktiv II (könnte, würde, hätte) where it naturally fits.
- Sentences: clear and short — maximum 12 words per sentence.
- Make it feel genuine — include small talk, hesitation words (Hmm, Ach so, Na ja), polite phrases (Bitte, Danke schön, Entschuldigung, Kein Problem), and a warm ending.
- Set the scene in a specific real German place — a city, a neighbourhood, a type of shop or location. NOT always Berlin. Use Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, etc.
- After the dialogue, add 2 short sentences of narrator text describing the outcome.

${NATURAL_GERMAN_RULES}

${COLLOCATION_RULES}

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

{
  "title": "",
  "date": "",
  "topic": "",
  "difficulty": "A2",
  "readingType": "speaking",
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
}

IMAGE KEYWORD:
- "imageKeyword": 2–3 simple English words for a Pixabay photo search that visually matches the story (e.g. "berlin parliament", "cafe friends", "doctor patient", "moving boxes"). Avoid abstract words — pick something a photo can show.

${selfCheckInstruction()}

Return JSON only. No markdown. No explanations outside JSON.`;

  return { system, user };
}

export function buildPromptForType(type: ReadingType, topicOverride?: string): GenerationPrompt {
  switch (type) {
    case "news":     return buildNewsPrompt(topicOverride);
    case "dialogue": return buildDialoguePrompt(topicOverride);
    case "story":    return buildStoryPrompt(topicOverride);
    case "speaking": return buildSpeakingPrompt(topicOverride);
  }
}
