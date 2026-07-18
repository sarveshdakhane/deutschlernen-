// Third-pass "grammar analyst" prompt. Runs after generation (and after
// review, on the final text) and ONLY reports which grammar features are
// actually present — it never generates or judges content. This keeps the
// generator free to focus purely on naturalness instead of also trying to
// satisfy grammarChecklist metadata while writing.

export function buildAnalysisSystemPrompt(): string {
  return `You are a German grammar analyst. Your only job is to read a piece of German text and precisely identify which grammatical features are actually present in it. You do not generate, edit, or judge the quality of the text — you only report facts about what grammar it contains.`;
}

export function buildAnalysisUserPrompt(text: string): string {
  return `Analyze the German text below and determine, based ONLY on what actually appears in the text (not what a text of this type usually contains), whether each of these grammar features is present:

- praesens: any present-tense (Präsens) verb form
- perfekt: any Perfekt past tense (haben/sein + past participle)
- modalverben: any modal verb (können, müssen, wollen, sollen, dürfen, mögen/möchten)
- nebensaetze: any subordinate clause introduced by a subordinating conjunction (weil, dass, wenn, obwohl, als, während, etc.) or an embedded indirect question
- relativsaetze: any relative clause (introduced by der/die/das/welcher etc. referring back to a noun)
- konjunktivII: any Konjunktiv II form (würde, könnte, hätte, wäre, or a hypothetical use of sollte, etc.)
- passiv: any passive-voice construction (werden-Passiv or sein-Passiv/Zustandspassiv)

TEXT:
"""
${text}
"""

Return valid JSON only, in this exact structure, with no markdown and no explanation outside the JSON:
{
  "praesens": true,
  "perfekt": true,
  "modalverben": true,
  "nebensaetze": true,
  "relativsaetze": true,
  "konjunktivII": true,
  "passiv": true
}
Each value must be a real boolean derived from the text — never a default or a guess.`;
}
