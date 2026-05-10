export function buildStoryPrompt(topic?: string): string {
  const topicInstruction = topic
    ? `The story topic must be: "${topic}".`
    : `Choose one realistic German B1 exam topic such as: moving to a new city, finding an apartment, first day at work, visiting the doctor, planning a holiday, writing to a language school, solving a problem with a neighbour, public transport problem, healthy lifestyle, or learning German for work.`;

  return `You are a German B1 exam teacher.

TASK:
Create a German B1-level reading text with a multiple choice quiz.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

${topicInstruction}

Requirements:

STORY:
- German B1-level story, 350–450 words.
- Clear B1 exam style. Mix short and medium sentences.
- Use mostly A2–B1 vocabulary with a few useful new words.
- Include: Präsens, Perfekt, Modalverben, Nebensätze, Relativsätze, Konjunktiv II, Passiv.

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
