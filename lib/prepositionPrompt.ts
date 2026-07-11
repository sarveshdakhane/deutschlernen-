const JSON_TEMPLATE = `{
  "questions": [
    {
      "sentence": "",
      "options": ["", "", "", ""],
      "answer": 0,
      "translation": ""
    }
  ]
}`;

export function buildPrepositionPrompt(): string {
  const today = new Date().toISOString().split("T")[0];

  return `You are a professional German B1 exam teacher creating a preposition practice exercise.

Today's date: ${today}

TASK:
Create exactly 7 German B1-level fill-in-the-blank sentences that test knowledge of German prepositions (Präpositionen). This is a daily practice set, so make it feel fresh — vary topics (work, travel, relationships, health, hobbies, shopping, weather, studies, daily life) and vary which preposition is being tested.

The output must be valid JSON only. Do not include markdown. Do not include explanations outside JSON.

PREPOSITION CASE GROUPS (use exactly as listed — do not move a preposition to a different group):
- GROUP Dativ: aus, bei, mit, nach, seit, von, zu, gegenüber
- GROUP Akkusativ: durch, für, gegen, ohne, um, bis
- GROUP Genitiv: wegen, trotz, während, statt
- GROUP Wechsel (two-way, take Dativ for location or Akkusativ for direction): an, auf, hinter, in, neben, über, unter, vor, zwischen

SENTENCE REQUIREMENTS:
- Each sentence must be natural, realistic B1-level German, one sentence long.
- Mark exactly one blank in each sentence with "___" (three underscores) where a preposition belongs.
- Across the 7 questions, cover a good mix of GROUP Wechsel, GROUP Dativ, GROUP Akkusativ, GROUP Genitiv, and verb + preposition combinations common at B1 (e.g. sich freuen auf/über, warten auf, denken an, träumen von, teilnehmen an, sich interessieren für, Angst haben vor, sich kümmern um, sich beschäftigen mit) — a verb+preposition combo's preposition still belongs to one of the groups above, so build its options the same way.
- Do not repeat the same preposition as the correct answer more than twice across the 7 questions.

OPTIONS — build every question this way to guarantee grammatical correctness:
1. Pick ONE group from the list above for this question.
2. Choose all 4 options exclusively from that same group (never mix groups within one question) — this guarantees all 4 options are grammatically valid in the sentence, so swapping the correct answer for a wrong one never breaks grammar, only meaning.
3. Write the noun phrase right after the blank (article/possessive pronoun + noun) already correctly declined for that group's case. For GROUP Wechsel, decide whether the sentence describes a static location (Dativ noun phrase, e.g. "dem Tisch", "der Wand") or movement/direction (Akkusativ noun phrase, e.g. "den Tisch", "die Wand") and decline the noun phrase accordingly.
4. Pick which of the 4 same-group prepositions is the one that actually fits the sentence's meaning/idiom — that is the correct "answer". The other 3 are wrong only because they don't fit the meaning, never because of grammar/case.
5. Each option is a single lowercase preposition, no article attached.
- "answer" is the 0-based index of the correct option (0 = first, 1 = second, 2 = third, 3 = fourth).
- Before finalizing, reread each sentence silently with the correct option inserted and confirm a native speaker would say exactly that sentence.

TRANSLATION:
- "translation" is the English translation of the full sentence with the blank correctly filled in.

Return this exact JSON structure with exactly 7 items in "questions":

${JSON_TEMPLATE}

Return JSON only. No markdown. No explanations outside JSON.`;
}
