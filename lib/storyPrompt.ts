import { ReadingType } from "./types";

const JSON_TEMPLATE = (readingType: ReadingType) => `{
  "title": "",
  "date": "",
  "topic": "",
  "difficulty": "B1",
  "readingType": "${readingType}",
  "story": "",
  "grammarChecklist": {
    "praesens": true,
    "perfekt": true,
    "modalverben": true,
    "nebensaetze": true,
    "relativsaetze": true,
    "konjunktivII": true,
    "passiv": true
  },
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

export function buildNewsPrompt(): string {
  return `You are a professional German B1 exam teacher.

TASK:
Create one realistic German B1-level news article (Nachrichtenartikel) suitable for language learners.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

CONTENT REQUIREMENTS:
- Choose a topic relevant to everyday life in Germany. Vary it each time. Examples: housing costs (Mietpreise), Deutschlandticket, Mindestlohn, recycling rules, local elections, public transport, weather events, job market, Krankenversicherung, school system, cultural events, integration, sport, environment.
- Style: factual and journalistic, but written in clear accessible B1 German — shorter sentences, common vocabulary.
- 280–340 words total.
- Include at least one direct quote from a person (an expert, a citizen, or an official).
- Naturally use Passiv, Nebensätze, and Modalverben as these appear in real German news.

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

Return JSON only. No markdown. No explanations outside JSON.`;
}

export function buildDialoguePrompt(): string {
  return `You are a professional German B1 exam teacher.

TASK:
Create a natural German B1-level dialogue (Gespräch) between two people for reading practice.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

CONTENT REQUIREMENTS:
- Two characters with realistic German first names — friends, flatmates, colleagues, or family members.
- Choose a fresh, everyday B1 topic each time. Examples: planning a weekend trip, discussing a new job, finding a flat, a misunderstanding between neighbours, deciding what to cook, talking about language learning, planning a birthday party, complaining about transport.
- 270–330 words total.
- Format each speaker line as: "Name: text" (each on its own line, separated by blank lines).
- Make it completely natural — include hesitation, follow-up questions, reactions, and short responses.
- End with 2–3 sentences of narrator text describing what happens after the conversation.
- At least 70% of the text should be direct speech.
- Use A2–B1 vocabulary naturally — no advanced grammar jargon.

VOCABULARY:
- 8–12 useful words or expressions from the dialogue.
- Include German word/phrase, English meaning, and a German example sentence.

SENTENCE PATTERNS:
- 4–6 useful conversational sentence patterns from the dialogue.

QUIZ — Multiple Choice:
- Exactly 4 questions testing comprehension of the dialogue.
- Each question has exactly 4 answer options.
- Exactly one option is correct.
- "answer" is the 0-based index of the correct option.

Return this exact JSON structure:

${JSON_TEMPLATE("dialogue")}

Return JSON only. No markdown. No explanations outside JSON.`;
}

export function buildStoryPrompt(): string {
  return `You are a professional German B1 exam teacher.

TASK:
Create one realistic German B1-level short story for reading practice.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

TOPIC:
Choose one realistic B1 topic (vary it — avoid repeating the same topics): work problems, friendships, family situations, doctor visits, online shopping, restaurant situations, language learning, workplace communication, neighbour problems, technology issues, social media misunderstandings, hobbies, stress and motivation, teamwork, customer service, planning events, cultural misunderstandings, job interviews, daily life in Germany.

STORY REQUIREMENTS:
- 350–420 words.
- Use natural, modern German — not robotic or overly formal.
- Use mostly A2–B1 vocabulary with a few useful new words introduced naturally.
- Mix narration and dialogue. At least 35% of the story must be dialogue.
- Dialogues must sound realistic and useful for speaking practice.
- Include emotions, opinions, reactions, and everyday communication.
- Write in a style similar to Goethe/TELC B1 reading texts, but more engaging and conversational.
- Naturally include: Präsens, Perfekt, Modalverben, Nebensätze, Relativsätze, Konjunktiv II, Passiv.

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

Return JSON only. No markdown. No explanations outside JSON.`;
}

export function buildSpeakingPrompt(): string {
  return `You are a friendly German A2 language teacher helping a learner improve their spoken German.

TASK:
Create a short, natural A2-level dialogue between two people that a learner can read aloud to practise speaking.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

CONTENT REQUIREMENTS:
- Two characters with names — friends, shopkeeper and customer, colleagues, or strangers meeting.
- Choose a fresh everyday A2 topic each time. Examples: ordering food or drinks at a café, buying something in a shop, asking for directions, making plans for the weekend, talking about the weather, introducing a friend, booking a table at a restaurant, talking about a hobby, a phone call to arrange a meeting, asking about opening hours.
- 180–220 words total — short enough to read aloud in 2 minutes.
- Format each line as: "Name: text" on its own line, separated by blank lines.
- Use ONLY A1–A2 vocabulary and grammar: Präsens, simple Perfekt with haben/sein, basic modal verbs (können, möchten, müssen), simple questions and answers.
- Short sentences — maximum 12 words per sentence.
- Natural and friendly tone. Include greetings, polite phrases (Bitte, Danke, Entschuldigung), and a clear ending.
- After the dialogue, add 2 sentences of narrator text describing the situation/outcome.

VOCABULARY:
- 6–8 key words or phrases from the dialogue that are useful for A2 learners.
- Include German word/phrase, English meaning, and a simple German example sentence.

QUIZ — Multiple Choice:
- Exactly 3 questions testing comprehension of the dialogue.
- Each question has exactly 4 answer options.
- Exactly one option is correct.
- "answer" is the 0-based index of the correct option.

SENTENCE PATTERNS:
- 3–4 simple sentence patterns from the dialogue useful for everyday speaking.

Return this exact JSON structure:

{
  "title": "",
  "date": "",
  "topic": "",
  "difficulty": "A2",
  "readingType": "speaking",
  "story": "",
  "grammarChecklist": {
    "praesens": true,
    "perfekt": true,
    "modalverben": true,
    "nebensaetze": false,
    "relativsaetze": false,
    "konjunktivII": false,
    "passiv": false
  },
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

Return JSON only. No markdown. No explanations outside JSON.`;
}

export function buildPromptForType(type: ReadingType): string {
  switch (type) {
    case "news":     return buildNewsPrompt();
    case "dialogue": return buildDialoguePrompt();
    case "story":    return buildStoryPrompt();
    case "speaking": return buildSpeakingPrompt();
  }
}
