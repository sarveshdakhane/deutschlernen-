import { Story } from "./types";

const newsSample: Story = {
  slug: "mietpreise-steigen-in-deutschen-staedten",
  title: "Mietpreise steigen weiter in deutschen Großstädten",
  date: "2026-05-21",
  topic: "Housing costs in Germany",
  imageKeyword: "apartment building germany",
  difficulty: "B1",
  readingType: "news",
  story: `Berlin (dpa) – Die Mietpreise in deutschen Großstädten sind auch im letzten Jahr weiter gestiegen. Laut einer neuen Studie des Instituts für Wohnungsmarktforschung zahlen Mieter in München, Frankfurt und Berlin besonders hohe Preise. In München kostet eine durchschnittliche Zweizimmerwohnung jetzt über 1.800 Euro im Monat – das sind zehn Prozent mehr als vor zwei Jahren.

Viele Menschen sind besorgt über diese Entwicklung. „Ich arbeite Vollzeit, aber ich kann mir kaum noch eine Wohnung in der Stadt leisten", sagt Thomas Maier, 34, der seit Jahren in Frankfurt wohnt. „Ich musste schon zweimal umziehen, weil die Miete erhöht wurde."

Die Bundesregierung hat mehrere Maßnahmen angekündigt, um das Problem zu lösen. Es sollen mehr neue Wohnungen gebaut werden – besonders in Städten mit hohem Bedarf. Außerdem wird die Mietpreisbremse in vielen Städten verlängert. Diese Regelung begrenzt, wie viel die Miete erhöht werden darf.

Experten sind sich jedoch nicht einig, ob diese Maßnahmen ausreichen. „Wir brauchen mindestens 400.000 neue Wohnungen pro Jahr", erklärt Dr. Sabine Hoffmann vom Deutschen Institut für Wirtschaftsforschung. „Im Moment werden aber nur rund 250.000 gebaut."

Auch auf dem Land steigen die Preise. Viele Menschen ziehen aus den teuren Städten in kleinere Gemeinden, weil sie dort günstiger wohnen können. Das führt aber dazu, dass auch dort die Nachfrage und damit die Mieten steigen.

Die Situation bleibt schwierig. Wer eine bezahlbare Wohnung sucht, braucht oft viel Geduld – und manchmal auch etwas Glück.`,
  grammarChecklist: { praesens: true, perfekt: true, modalverben: true, nebensaetze: true, relativsaetze: true, konjunktivII: false, passiv: true },
  vocabulary: [
    { word: "die Mietpreise (Pl.)", meaning: "rent prices", example: "Die Mietpreise in Berlin sind sehr hoch." },
    { word: "die Studie", meaning: "the study / report", example: "Eine neue Studie zeigt, dass die Preise steigen." },
    { word: "sich leisten", meaning: "to afford", example: "Ich kann mir diese Wohnung nicht leisten." },
    { word: "ankündigen", meaning: "to announce", example: "Die Regierung hat neue Maßnahmen angekündigt." },
    { word: "die Maßnahme", meaning: "the measure / step", example: "Es werden neue Maßnahmen ergriffen." },
    { word: "die Mietpreisbremse", meaning: "rent cap (law)", example: "Die Mietpreisbremse begrenzt Mieterhöhungen." },
    { word: "ausreichen", meaning: "to be sufficient", example: "Die Maßnahmen reichen nicht aus." },
    { word: "die Nachfrage", meaning: "the demand", example: "Die Nachfrage nach Wohnungen ist sehr groß." },
    { word: "bezahlbar", meaning: "affordable", example: "Bezahlbare Wohnungen sind selten geworden." },
    { word: "die Geduld", meaning: "patience", example: "Man braucht viel Geduld bei der Wohnungssuche." },
  ],
  sentencePatterns: [
    { pattern: "Laut einer neuen Studie ...", meaning: "According to a new study ...", example: "Laut einer neuen Studie steigen die Mietpreise weiter." },
    { pattern: "Ich kann mir kaum noch ... leisten.", meaning: "I can barely afford ... anymore.", example: "Ich kann mir kaum noch eine Wohnung in der Stadt leisten." },
    { pattern: "Es sollen mehr ... gebaut werden.", meaning: "More ... are to be built.", example: "Es sollen mehr neue Wohnungen gebaut werden." },
    { pattern: "Experten sind sich nicht einig, ob ...", meaning: "Experts don't agree on whether ...", example: "Experten sind sich nicht einig, ob die Maßnahmen ausreichen." },
  ],
  quiz: {
    questions: [
      { question: "Wie viel kostet eine Zweizimmerwohnung in München durchschnittlich?", options: ["Über 1.200 Euro", "Über 1.500 Euro", "Über 1.800 Euro", "Über 2.200 Euro"], answer: 2 },
      { question: "Was ist die Mietpreisbremse?", options: ["Ein Programm zum Bau neuer Wohnungen", "Eine Regelung, die Mieterhöhungen begrenzt", "Eine Steuer für Vermieter", "Ein Zuschuss für Mieter"], answer: 1 },
      { question: "Wie viele neue Wohnungen werden laut Dr. Hoffmann pro Jahr gebraucht?", options: ["200.000", "250.000", "350.000", "400.000"], answer: 3 },
      { question: "Warum steigen die Mieten auch auf dem Land?", options: ["Weil die Regierung dort nicht eingreift", "Weil viele Menschen aus den Städten dorthin ziehen", "Weil auf dem Land mehr Wohnungen gebaut werden", "Weil die Löhne auf dem Land gestiegen sind"], answer: 1 },
    ],
  },
};

const dialogueSample: Story = {
  slug: "wohnungssuche-in-berlin",
  title: "Wohnungssuche in Berlin",
  date: "2026-05-21",
  topic: "Flat hunting in a big city",
  imageKeyword: "berlin city apartment",
  difficulty: "B1",
  readingType: "dialogue",
  story: `Mia und Jonas sind Freunde. Mia sucht seit drei Monaten eine neue Wohnung in Berlin und ruft Jonas an, um ihm davon zu erzählen.

Mia: Jonas, ich glaube, ich werde verrückt. Ich habe heute wieder fünf Absagen bekommen.

Jonas: Ernsthaft? Aber du hast doch alle Unterlagen dabei, oder?

Mia: Ja, natürlich! Gehaltsnachweis, Schufa-Auskunft, alles. Trotzdem schreiben sie einfach nicht zurück – oder wenn doch, sagen sie, dass jemand anderes die Wohnung bekommen hat.

Jonas: Das ist echt frustrierend. Wie viele Bewerbungen hast du schon abgeschickt?

Mia: Über dreißig! Und die meisten Wohnungen sind sowieso viel zu teuer. Für eine Zweizimmerwohnung verlangen sie hier 1.400 Euro kalt. Das kann ich mir einfach nicht leisten.

Jonas: Hast du auch in Neukölln oder Spandau geschaut? Da ist es vielleicht noch ein bisschen günstiger.

Mia: Ja, schon. Aber selbst dort sind die Preise gestiegen. Ich überlege ehrlich gesagt, ob ich nicht doch in eine WG ziehen soll.

Jonas: Das wäre doch gar keine schlechte Idee! Du könntest Geld sparen und wärst außerdem nicht so allein.

Mia: Stimmt… ich hab das immer vermieden, weil ich meinen eigenen Raum haben wollte. Aber vielleicht muss ich da jetzt flexibler sein.

Jonas: Soll ich dir bei der Suche helfen? Ich kenne ein paar gute Websites, wo WG-Zimmer angeboten werden.

Mia: Das wäre super! Danke, Jonas.

Jonas: Kein Problem. Wir schaffen das zusammen.

Nach dem Telefonat schaute Mia sofort auf den Websites nach, die Jonas ihr empfohlen hatte. Schon am nächsten Tag hatte sie zwei Besichtigungstermine für WG-Zimmer. Sie war zum ersten Mal seit Wochen wieder optimistisch.`,
  grammarChecklist: { praesens: true, perfekt: true, modalverben: true, nebensaetze: true, relativsaetze: true, konjunktivII: true, passiv: false },
  vocabulary: [
    { word: "die Absage", meaning: "the rejection", example: "Ich habe heute drei Absagen bekommen." },
    { word: "der Gehaltsnachweis", meaning: "proof of income", example: "Für die Wohnung brauche ich einen Gehaltsnachweis." },
    { word: "die Schufa-Auskunft", meaning: "credit check report", example: "Vermieter verlangen oft eine Schufa-Auskunft." },
    { word: "die Bewerbung", meaning: "the application", example: "Ich habe über dreißig Bewerbungen abgeschickt." },
    { word: "kalt (Miete)", meaning: "excluding utilities (rent)", example: "Die Wohnung kostet 900 Euro kalt." },
    { word: "sich leisten", meaning: "to afford", example: "Das kann ich mir nicht leisten." },
    { word: "die WG (Wohngemeinschaft)", meaning: "shared flat", example: "Ich wohne in einer WG mit zwei anderen Studenten." },
    { word: "die Besichtigung", meaning: "the flat viewing", example: "Ich habe morgen eine Besichtigung." },
    { word: "verlangen", meaning: "to ask / charge (a price)", example: "Sie verlangen 1.400 Euro Miete." },
    { word: "optimistisch", meaning: "optimistic", example: "Sie war wieder optimistisch." },
  ],
  sentencePatterns: [
    { pattern: "Ich überlege, ob ich ... soll.", meaning: "I'm thinking about whether I should ...", example: "Ich überlege, ob ich in eine WG ziehen soll." },
    { pattern: "Das kann ich mir einfach nicht leisten.", meaning: "I simply can't afford that.", example: "1.400 Euro Miete – das kann ich mir einfach nicht leisten." },
    { pattern: "Soll ich dir bei ... helfen?", meaning: "Should I help you with ...?", example: "Soll ich dir bei der Suche helfen?" },
    { pattern: "Vielleicht muss ich da flexibler sein.", meaning: "Maybe I need to be more flexible about that.", example: "Vielleicht muss ich da jetzt flexibler sein." },
  ],
  quiz: {
    questions: [
      { question: "Warum ist Mia frustriert?", options: ["Sie hat keine Unterlagen für die Bewerbung.", "Sie bekommt immer wieder Absagen bei der Wohnungssuche.", "Jonas hilft ihr nicht bei der Suche.", "Sie kann sich keine WG leisten."], answer: 1 },
      { question: "Was schlägt Jonas vor?", options: ["Dass Mia in eine andere Stadt zieht.", "Dass Mia weniger Wohnungen sucht.", "Dass Mia in eine WG zieht.", "Dass Mia ihre Unterlagen verbessert."], answer: 2 },
      { question: "Warum hatte Mia eine WG bisher vermieden?", options: ["Weil sie schlechte Erfahrungen gemacht hatte.", "Weil WGs zu teuer sind.", "Weil sie ihren eigenen Raum haben wollte.", "Weil Jonas davon abgeraten hatte."], answer: 2 },
      { question: "Was passiert nach dem Telefonat?", options: ["Mia bekommt sofort eine Wohnung.", "Jonas schickt ihr eine Liste von Wohnungen.", "Mia bekommt zwei Besichtigungstermine für WG-Zimmer.", "Mia beschließt, in eine andere Stadt zu ziehen."], answer: 2 },
    ],
  },
};

const storySamples: Story[] = [
  {
    slug: "umzug-in-eine-neue-stadt",
    title: "Der Umzug in eine neue Stadt",
    date: "2026-05-21",
    topic: "Moving to a new city",
    imageKeyword: "moving boxes new home",
    difficulty: "B1",
    readingType: "story",
    story: `Lena hatte sich lange überlegt, ob sie nach München ziehen sollte. Die Stelle, die ihr angeboten wurde, war sehr gut bezahlt, aber sie kannte niemanden in der Stadt. Nach langen Gesprächen mit ihrer Familie entschied sie sich schließlich für den Umzug.

Am ersten Tag in ihrer neuen Wohnung stand Lena vor vielen Kartons. Die Wohnung, die sie gemietet hatte, war zwar klein, aber sehr hell und lag in einem ruhigen Viertel. Sie musste noch viele Dinge organisieren: einen Hausarzt suchen, sich ummelden und das Internet anmelden.

Ihre neue Kollegin Sara, die schon seit zehn Jahren in München lebte, bot ihr an, die Stadt zu zeigen. „Du könntest ruhig mal entspannen", sagte Sara lachend. „Alles wird sich einrichten." Lena war froh, dass sie so nette Kollegen hatte.

In der ersten Woche wurden alle neuen Mitarbeiter zum Firmenfest eingeladen. Lena hatte sich gut vorbereitet und neue Visitenkarten mitgebracht. Beim Fest wurde viel geredet und gelacht. Lena stellte fest, dass die meisten Kollegen sehr offen und freundlich waren.

Am Wochenende erkundete Lena die Stadt allein. Sie ist mit der U-Bahn zum Marienplatz gefahren und hat dort einen Kaffee getrunken. Dann hat sie das Deutsche Museum besucht, das ihr sehr gut gefallen hat. Auf dem Heimweg hat sie frisches Brot und Obst auf dem Markt gekauft.

Manchmal vermisste sie ihre alte Stadt und ihre Freunde. Aber langsam begann München sich wie ein neues Zuhause anzufühlen. Lena war zuversichtlich, dass sie die richtige Entscheidung getroffen hatte.`,
    grammarChecklist: { praesens: true, perfekt: true, modalverben: true, nebensaetze: true, relativsaetze: true, konjunktivII: true, passiv: true },
    vocabulary: [
      { word: "der Umzug", meaning: "the move / relocation", example: "Der Umzug nach München war aufregend." },
      { word: "überlegen", meaning: "to consider / think over", example: "Sie hatte lange überlegt, ob sie umziehen sollte." },
      { word: "anbieten", meaning: "to offer", example: "Sara bot ihr an, die Stadt zu zeigen." },
      { word: "erkunden", meaning: "to explore", example: "Am Wochenende erkundete Lena die Stadt." },
      { word: "ummelden", meaning: "to re-register (change address)", example: "Sie musste sich bei der Behörde ummelden." },
      { word: "zuversichtlich", meaning: "confident / optimistic", example: "Sie war zuversichtlich, dass alles gut wird." },
      { word: "das Viertel", meaning: "the neighbourhood / district", example: "Sie wohnt in einem ruhigen Viertel." },
      { word: "feststellen", meaning: "to notice / realize", example: "Sie stellte fest, dass die Kollegen freundlich waren." },
      { word: "vermissen", meaning: "to miss (someone/something)", example: "Manchmal vermisste sie ihre alte Stadt." },
      { word: "sich einrichten", meaning: "to settle in / work out", example: "Alles wird sich einrichten." },
    ],
    sentencePatterns: [
      { pattern: "Ich hatte mich lange überlegt, ob ich ... sollte.", meaning: "I had thought for a long time about whether I should ...", example: "Ich hatte mich lange überlegt, ob ich nach Berlin ziehen sollte." },
      { pattern: "Du könntest ruhig mal ...", meaning: "You could just / might as well ...", example: "Du könntest ruhig mal eine Pause machen." },
      { pattern: "Langsam begann ... sich wie ... anzufühlen.", meaning: "Slowly ... began to feel like ...", example: "Langsam begann die neue Stadt sich wie ein Zuhause anzufühlen." },
    ],
    quiz: {
      questions: [
        { question: "Warum ist Lena nach München gezogen?", options: ["Sie wollte ihre Familie besuchen.", "Sie hatte eine gut bezahlte Stelle bekommen.", "Ihre beste Freundin Sara wohnte dort.", "Sie wollte das Deutsche Museum besuchen."], answer: 1 },
        { question: "Was bot Lenas Kollegin Sara ihr an?", options: ["Ihr bei der Wohnungssuche zu helfen.", "Gemeinsam zum Marienplatz zu fahren.", "Ihr die Stadt zu zeigen.", "Ihr Büro mit ihr zu teilen."], answer: 2 },
        { question: "Was hat Lena am Wochenende gemacht?", options: ["Sie hat ihre Eltern besucht.", "Sie ist mit Sara ins Restaurant gegangen.", "Sie hat das Deutsche Museum besucht und auf dem Markt eingekauft.", "Sie hat sich auf das Firmenfest vorbereitet."], answer: 2 },
        { question: "Wie blieb Lena mit ihren alten Freunden in Kontakt?", options: ["Sie ist jedes Wochenende in ihre alte Stadt gefahren.", "Sie hat ihnen Nachrichten geschrieben und sie regelmäßig angerufen.", "Sie hat Briefe per Post geschickt.", "Sie hat keinen Kontakt gehalten."], answer: 1 },
        { question: "Wie fühlte sich Lena am Ende?", options: ["Sie bereute den Umzug.", "Sie wollte so schnell wie möglich zurückziehen.", "Sie war zuversichtlich, die richtige Entscheidung getroffen zu haben.", "Sie war sehr unglücklich."], answer: 2 },
      ],
    },
  },
  {
    slug: "beim-arzt",
    title: "Ein Besuch beim Arzt",
    date: "2026-05-21",
    topic: "Visiting the doctor",
    imageKeyword: "doctor patient clinic",
    difficulty: "B1",
    readingType: "story",
    story: `Markus hatte seit drei Tagen Halsschmerzen und Fieber. Er wollte zuerst einfach zu Hause bleiben und viel Tee trinken, aber seine Frau bestand darauf, dass er zum Arzt gehen sollte. Also rief er morgens früh in der Praxis an und bat um einen Termin.

Die Arzthelferin, die sehr freundlich war, gab ihm einen Termin für den gleichen Tag. „Sie können um 14 Uhr kommen", sagte sie. Markus war erleichtert, dass er nicht lange warten musste.

Im Wartezimmer saßen schon mehrere Patienten. Markus nahm sich eine Zeitschrift und versuchte, sich abzulenken. Nach zwanzig Minuten wurde er aufgerufen. Doktor Fischer, der seit vielen Jahren in dieser Praxis arbeitete, begrüßte ihn freundlich.

„Was kann ich für Sie tun?", fragte der Arzt. Markus erklärte seine Beschwerden. Der Arzt untersuchte seinen Hals und maß die Temperatur. „Sie haben eine Mandelentzündung", sagte Dr. Fischer. „Ich werde Ihnen Antibiotika verschreiben."

Außerdem riet er Markus, viel zu trinken und sich auszuruhen. „Sie sollten mindestens drei Tage zu Hause bleiben", sagte er. Markus nickte und bedankte sich. Er bekam eine Krankmeldung für die Arbeit.

In der Apotheke wurde das Rezept eingelöst. Die Apothekerin erklärte genau, wie die Medikamente eingenommen werden sollten. Zu Hause legte er sich sofort hin. Seine Frau brachte ihm heiße Suppe und Kräutertee. Nach zwei Tagen fühlte er sich schon viel besser.`,
    grammarChecklist: { praesens: true, perfekt: true, modalverben: true, nebensaetze: true, relativsaetze: true, konjunktivII: true, passiv: true },
    vocabulary: [
      { word: "die Halsschmerzen (Pl.)", meaning: "sore throat", example: "Er hatte seit drei Tagen Halsschmerzen." },
      { word: "bestehen auf (+ Dat.)", meaning: "to insist on", example: "Sie bestand darauf, dass er zum Arzt geht." },
      { word: "erleichtert", meaning: "relieved", example: "Er war erleichtert, dass er einen Termin bekam." },
      { word: "die Beschwerden (Pl.)", meaning: "symptoms / complaints", example: "Er erklärte dem Arzt seine Beschwerden." },
      { word: "verschreiben", meaning: "to prescribe", example: "Der Arzt hat ihm Antibiotika verschrieben." },
      { word: "die Krankmeldung", meaning: "sick note", example: "Er bekam eine Krankmeldung für die Arbeit." },
      { word: "einlösen", meaning: "to fill (a prescription)", example: "Das Rezept wurde in der Apotheke eingelöst." },
      { word: "sich ausruhen", meaning: "to rest", example: "Der Arzt riet ihm, sich auszuruhen." },
    ],
    sentencePatterns: [
      { pattern: "Sie bestand darauf, dass ...", meaning: "She insisted that ...", example: "Sie bestand darauf, dass er sofort zum Arzt geht." },
      { pattern: "Sie sollten mindestens ... Tage ...", meaning: "You should at least ... days ...", example: "Sie sollten mindestens drei Tage zu Hause bleiben." },
      { pattern: "Er riet mir, ... zu ...", meaning: "He advised me to ...", example: "Er riet mir, viel Wasser zu trinken und mich auszuruhen." },
    ],
    quiz: {
      questions: [
        { question: "Warum ist Markus zum Arzt gegangen?", options: ["Er hatte seit einer Woche Bauchschmerzen.", "Er hatte seit drei Tagen Halsschmerzen und Fieber.", "Er brauchte eine Krankmeldung.", "Er wollte Antibiotika kaufen."], answer: 1 },
        { question: "Wer hat darauf bestanden, dass Markus zum Arzt geht?", options: ["Sein Chef", "Die Arzthelferin", "Seine Frau", "Ein Freund"], answer: 2 },
        { question: "Was hat Dr. Fischer bei Markus diagnostiziert?", options: ["Eine Grippe", "Einen starken Schnupfen", "Eine Mandelentzündung", "Einen Virus"], answer: 2 },
        { question: "Was empfahl der Arzt Markus?", options: ["Jeden Tag zur Kontrolle kommen.", "Mindestens eine Woche zu Hause bleiben.", "Viel Sport treiben.", "Viel trinken, sich ausruhen und mindestens drei Tage zu Hause bleiben."], answer: 3 },
        { question: "Wie hat sich Markus nach zwei Tagen gefühlt?", options: ["Noch genauso schlecht.", "Schon viel besser.", "Er musste wieder zum Arzt gehen.", "Er hatte neue Symptome."], answer: 1 },
      ],
    },
  },
];

const speakingSample: Story = {
  slug: "im-cafe-bestellen",
  title: "Im Café bestellen",
  date: "2026-05-21",
  topic: "Ordering at a café",
  imageKeyword: "cafe coffee friends",
  difficulty: "A2",
  readingType: "speaking",
  story: `Lena und Tom gehen zusammen in ein Café. Sie suchen einen Tisch und setzen sich.

Kellner: Guten Tag! Was möchten Sie trinken?

Lena: Ich möchte bitte einen Kaffee mit Milch.

Tom: Und ich nehme einen Tee mit Zitrone, bitte.

Kellner: Möchten Sie auch etwas essen?

Lena: Ja, gern. Haben Sie Kuchen?

Kellner: Ja, wir haben Käsekuchen und Schokoladenkuchen.

Lena: Ich nehme ein Stück Käsekuchen, bitte.

Tom: Für mich nichts, danke. Ich habe keinen Hunger.

Kellner: Alles klar! Das kommt sofort.

Lena: Danke schön!

Nach zehn Minuten bringt der Kellner den Kaffee, den Tee und den Kuchen. Lena und Tom reden über ihre Pläne für das Wochenende.`,
  grammarChecklist: { praesens: true, perfekt: false, modalverben: true, nebensaetze: false, relativsaetze: false, konjunktivII: false, passiv: false },
  vocabulary: [
    { word: "bestellen", meaning: "to order", example: "Ich möchte einen Kaffee bestellen." },
    { word: "der Kellner", meaning: "the waiter", example: "Der Kellner bringt das Essen." },
    { word: "möchten", meaning: "would like to", example: "Ich möchte einen Tee, bitte." },
    { word: "das Stück", meaning: "the piece / slice", example: "Ein Stück Kuchen, bitte." },
    { word: "keinen Hunger haben", meaning: "to not be hungry", example: "Ich habe keinen Hunger." },
    { word: "sofort", meaning: "immediately / right away", example: "Das Essen kommt sofort." },
    { word: "gern", meaning: "gladly / yes please", example: "Ja, gern! Das nehme ich." },
  ],
  sentencePatterns: [
    { pattern: "Ich möchte bitte ...", meaning: "I would like ... please", example: "Ich möchte bitte einen Kaffee." },
    { pattern: "Haben Sie ...?", meaning: "Do you have ...?", example: "Haben Sie Kuchen?" },
    { pattern: "Für mich ..., bitte.", meaning: "For me ..., please.", example: "Für mich einen Tee, bitte." },
    { pattern: "Das kommt sofort.", meaning: "That's coming right away.", example: "Ihr Kaffee kommt sofort." },
  ],
  quiz: {
    questions: [
      { question: "Was bestellt Lena zu trinken?", options: ["Einen Tee mit Zitrone", "Einen Kaffee mit Milch", "Ein Glas Wasser", "Einen Orangensaft"], answer: 1 },
      { question: "Welchen Kuchen nimmt Lena?", options: ["Schokoladenkuchen", "Apfelkuchen", "Käsekuchen", "Keinen Kuchen"], answer: 2 },
      { question: "Warum bestellt Tom keinen Kuchen?", options: ["Er mag keinen Kuchen.", "Er hat keinen Hunger.", "Der Kuchen ist zu teuer.", "Er ist krank."], answer: 1 },
    ],
  },
};

let storyIndex = -1;

export function getSampleForType(type: "news" | "dialogue" | "story" | "speaking"): Story {
  const today = new Date().toISOString().split("T")[0];
  if (type === "news") return { ...newsSample, date: today };
  if (type === "dialogue") return { ...dialogueSample, date: today };
  if (type === "speaking") return { ...speakingSample, date: today };
  storyIndex = (storyIndex + 1) % storySamples.length;
  return { ...storySamples[storyIndex], date: today };
}

export function getSampleStory(): Story {
  return getSampleForType("story");
}

export const sampleStories = storySamples;
export const getSampleStoryBySlug = (slug: string): Story | undefined =>
  storySamples.find((s) => s.slug === slug);
