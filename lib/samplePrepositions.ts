import { PrepositionQuestion } from "./types";

// Each question's 4 options are drawn from a single grammatical case group
// (see PREPOSITION CASE GROUPS in prepositionPrompt.ts) and the noun phrase
// after the blank is already declined for that case. That way every option
// stays grammatically valid — only the meaning/idiom decides right vs. wrong.
export const samplePrepositionQuestions: PrepositionQuestion[] = [
  {
    sentence: "Ich freue mich schon sehr ___ die Ferien im Sommer.",
    options: ["auf", "an", "über", "in"],
    answer: 0,
    translation: "I am really looking forward to the summer holidays.",
  },
  {
    sentence: "Das Geschenk ist ___ meine beste Freundin.",
    options: ["für", "gegen", "ohne", "um"],
    answer: 0,
    translation: "The gift is for my best friend.",
  },
  {
    sentence: "Die Katze liegt ___ dem Sofa und schläft.",
    options: ["unter", "über", "vor", "hinter"],
    answer: 0,
    translation: "The cat is lying under the sofa and sleeping.",
  },
  {
    sentence: "___ des schlechten Wetters sind wir zu Hause geblieben.",
    options: ["Wegen", "Trotz", "Während", "Statt"],
    answer: 0,
    translation: "Because of the bad weather, we stayed at home.",
  },
  {
    sentence: "Er geht heute ___ dem Zahnarzt, weil er starke Zahnschmerzen hat.",
    options: ["zu", "bei", "nach", "von"],
    answer: 0,
    translation: "He is going to the dentist today because he has bad toothache.",
  },
  {
    sentence: "Meine Schwester kümmert sich ___ unsere kranke Oma.",
    options: ["um", "für", "gegen", "ohne"],
    answer: 0,
    translation: "My sister takes care of our sick grandmother.",
  },
  {
    sentence: "Sie hat Angst ___ großen Hunden.",
    options: ["vor", "in", "unter", "zwischen"],
    answer: 0,
    translation: "She is afraid of big dogs.",
  },
];
