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
  const pick = categories[Math.floor((new Date(today).getTime() / 86400000) % categories.length)];

  return `You are a professional German news journalist writing for B1 language learners.

Today's date: ${today}

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
- Naturally use: Passiv, Nebensätze mit "dass/weil/obwohl", Modalverben, Konjunktiv II for reported speech.
- Do NOT write about Mietpreise, Deutschlandticket, or recycling — pick something more substantive from the category above.

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
  const pick = topics[Math.floor((new Date(today).getTime() / 86400000) % topics.length)];

  return `You are a professional German B1 exam teacher and dialogue writer.

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
- Use natural B1 German: Perfekt for past, Konjunktiv II for suggestions/wishes, Modalverben, Nebensätze mit "weil/dass/wenn/obwohl".
- Set the scene in a specific German city or region — NOT always Berlin. Rotate between cities like Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, Leipzig, Düsseldorf.

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
  const pick = scenarios[Math.floor((new Date(today).getTime() / 86400000) % scenarios.length)];

  return `You are a friendly German A2 language teacher helping a learner improve their spoken German.

TASK:
Create a natural A2-level dialogue between two people that a learner can read aloud to practise speaking German.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

SCENARIO FOR TODAY: ${pick}

CONTENT REQUIREMENTS:
- Two characters with names that fit the scenario — give them different personalities.
- 260–310 words total — long enough to be a real conversation, short enough to read aloud in 2–3 minutes.
- Format each line as: "Name: text" on its own line, separated by a blank line.
- Use ONLY A1–A2 vocabulary and grammar: Präsens, simple Perfekt with haben/sein, modal verbs (können, möchten, müssen, dürfen), simple questions and answers, basic Konjunktiv II (könnte, würde, hätte).
- Sentences: clear and short — maximum 12 words per sentence.
- Make it feel genuine — include small talk, hesitation words (Hmm, Ach so, Na ja), polite phrases (Bitte, Danke schön, Entschuldigung, Kein Problem), and a warm ending.
- Set the scene in a specific real German place — a city, a neighbourhood, a type of shop or location. NOT always Berlin. Use Hamburg, Munich, Frankfurt, Cologne, Dresden, Stuttgart, etc.
- After the dialogue, add 2 short sentences of narrator text describing the outcome.

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
