// Hand-vetted natural German reference passages, used ONLY for regression
// testing: (a) as a "what good looks like" reference for manual review, and
// (b) as a deterministic guard (goldenExamples.test.ts) that these fixtures
// never end up copy-pasted into a production prompt. NEVER imported by
// lib/storyPrompt.ts or any other production code path.

export const GOLDEN_EXAMPLES: Record<string, string> = {
  hotel: `Empfang: Guten Tag, Hotel Sonnenblick, wie kann ich Ihnen helfen?
Gast: Guten Tag, ich hätte gern ein Doppelzimmer vom 3. bis zum 5. Juli.
Empfang: Einen Moment, ich schaue nach... Ja, das geht. Zwei Nächte macht dann 180 Euro.
Gast: Perfekt, das nehme ich.`,

  restaurant: `Kellner: Haben Sie schon gewählt?
Gast: Ja, ich hätte gern das Schnitzel mit Pommes, bitte.
Kellner: Gerne. Und zu trinken?
Gast: Ein Mineralwasser, bitte.`,

  doctor: `Ärztin: Was führt Sie zu mir?
Patient: Ich habe seit zwei Tagen starke Kopfschmerzen und bin ständig müde.
Ärztin: Haben Sie auch Fieber gemessen?
Patient: Nein, noch nicht, aber ich fühle mich wirklich schlapp.`,

  jobInterview: `Personalerin: Erzählen Sie mir kurz, warum Sie sich bei uns beworben haben.
Bewerber: Ehrlich gesagt reizt mich vor allem die Möglichkeit, im Team zu arbeiten und Verantwortung zu übernehmen.
Personalerin: Das klingt gut. Wo sehen Sie sich in fünf Jahren?`,
};
