export function buildStoryPrompt(topic?: string): string {
  const topicInstruction = topic
    ? `The story topic must be: "${topic}".`
    : `Choose one realistic B1 topic from this list (vary it — avoid repeating moving/apartments/travel too often): work problems, friendships, family situations, doctor visits, online shopping, restaurant situations, language learning, workplace communication, neighbour problems, technology issues, social media misunderstandings, hobbies, stress and motivation, teamwork, customer service, planning events, cultural misunderstandings, job interviews, daily life in Germany.`;

  return `You are a professional German B1 exam teacher.

TASK:
Create one realistic German B1-level story with a multiple choice quiz.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

${topicInstruction}

STORY requirements:
- 350–450 words.
- Use natural, modern German — not robotic or overly formal.
- Use mostly A2–B1 vocabulary with a few useful new words introduced naturally.
- Mix narration and dialogue. At least 35% of the story must be dialogue.
- Dialogues must sound realistic and useful for speaking practice.
- Include emotions, opinions, reactions, and everyday communication.
- Write in a style similar to Goethe/TELC B1 reading texts, but more engaging and conversational.
- Naturally include: Präsens, Perfekt, Modalverben, Nebensätze, Relativsätze, Konjunktiv II, Passiv.

VOCABULARY:
- 10–15 useful words from the story.
- Include German word, English meaning, and German example sentence.

SENTENCE PATTERNS:
- 6–10 sentence patterns from the story useful for B1 writing.

QUIZ — Multiple Choice:
- Exactly 5 questions testing reading comprehension of the story.
- Each question has exactly 4 answer options.
- Exactly one option is correct. The others are plausible but clearly wrong based on the story.
- "answer" is the 0-based index of the correct option (0 = first, 1 = second, 2 = third, 3 = fourth).

Return this exact JSON structure:

{
  "title": "",
  "date": "",
  "topic": "",
  "difficulty": "B1",
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
}

Return JSON only. No markdown. No explanations outside JSON.`;
}
