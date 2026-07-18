import { describe, expect, it } from "vitest";
import { validateContentQuality } from "../../lib/claude";
import { Story } from "../../lib/types";

// Regression test for a real production bug: validateContentQuality's
// speaker-line regex originally required a single-word name immediately
// before the colon, which silently rejected perfectly natural German
// dialogue using titled/multi-word names ("Frau Berg:", "Herr Klein:",
// "Dr. Fischer:") — exactly what the "speaking" scenarios (hotel, doctor's
// office, pharmacy) in lib/storyPrompt.ts naturally produce. That caused
// those reading types to throw and silently fall back to the static
// lib/sampleStories.ts content instead of the newly generated text.

function makeStory(story: string, readingType: Story["readingType"] = "speaking"): Story {
  return {
    slug: "test", title: "Test", date: "2026-07-18", topic: "test",
    difficulty: "A2", readingType, story,
    grammarChecklist: {
      praesens: false, perfekt: false, modalverben: false,
      nebensaetze: false, relativsaetze: false, konjunktivII: false, passiv: false,
    },
    vocabulary: [], sentencePatterns: [], quiz: { questions: [] },
  };
}

describe("validateContentQuality", () => {
  it("accepts dialogue using single-word first names", () => {
    const story = makeStory(`Mia: Jonas, ich glaube, ich werde verrückt.

Jonas: Ernsthaft? Was ist denn los?`);
    expect(() => validateContentQuality(story, "dialogue")).not.toThrow();
  });

  it("accepts dialogue using titled, multi-word German names", () => {
    const story = makeStory(`Frau Berg: Guten Tag! Was kann ich für Sie tun?

Herr Klein: Ich hätte gern Informationen zu den Öffnungszeiten.

Frau Berg: Kein Problem. Wir haben von Montag bis Freitag geöffnet.

Herr Klein: Super, danke schön!`);
    expect(() => validateContentQuality(story, "speaking")).not.toThrow();
  });

  it("accepts dialogue using a title with a period, like 'Dr. Fischer:'", () => {
    const story = makeStory(`Dr. Fischer: Was kann ich für Sie tun?

Markus: Ich habe seit drei Tagen Halsschmerzen.

Dr. Fischer: Das klingt nach einer Erkältung.`);
    expect(() => validateContentQuality(story, "dialogue")).not.toThrow();
  });

  it("rejects empty story text", () => {
    const story = makeStory("   ");
    expect(() => validateContentQuality(story, "story")).toThrow(/empty/i);
  });

  it("rejects a duplicated paragraph", () => {
    const paragraph = "Dies ist ein ziemlich langer Absatz, der eindeutig mehr als vierzig Zeichen hat.";
    const story = makeStory(`${paragraph}\n\nEin anderer Absatz dazwischen mit genug Inhalt.\n\n${paragraph}`, "story");
    expect(() => validateContentQuality(story, "story")).toThrow(/duplicated paragraph/i);
  });

  it("rejects a dialogue that doesn't follow the 'Name: text' format", () => {
    const story = makeStory(`Dies ist einfach nur ein Fließtext ohne Sprecherformat, wie er in einem Artikel vorkommen würde und keine Doppelpunkte am Zeilenanfang enthält.`);
    expect(() => validateContentQuality(story, "dialogue")).toThrow(/speaker format/i);
  });
});
