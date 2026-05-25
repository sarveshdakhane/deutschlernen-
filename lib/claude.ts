import Groq from "groq-sdk";
import { Story, ReadingType } from "./types";
import { buildPromptForType } from "./storyPrompt";
import { getSampleForType } from "./sampleStories";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateStory(data: unknown, expectedType: ReadingType): Story {
  if (typeof data !== "object" || data === null) throw new Error("Response is not an object");
  const d = data as Record<string, unknown>;

  const required = ["title", "date", "topic", "story", "vocabulary", "quiz"];
  for (const field of required) {
    if (!d[field]) throw new Error(`Missing field: ${field}`);
  }

  const slug = d.slug
    ? String(d.slug)
    : slugify(String(d.title)) + "-" + String(d.date).replace(/-/g, "");

  const readingType: ReadingType =
    d.readingType === "news" || d.readingType === "dialogue" || d.readingType === "story" || d.readingType === "speaking"
      ? (d.readingType as ReadingType)
      : expectedType;

  return {
    slug,
    title: String(d.title),
    date: String(d.date),
    topic: String(d.topic),
    difficulty: d.difficulty === "A2" ? "A2" : "B1",
    readingType,
    story: String(d.story),
    grammarChecklist: {
      praesens: true, perfekt: true, modalverben: true,
      nebensaetze: true, relativsaetze: true, konjunktivII: true, passiv: true,
      ...((d.grammarChecklist as object) ?? {}),
    },
    vocabulary: Array.isArray(d.vocabulary) ? d.vocabulary : [],
    sentencePatterns: Array.isArray(d.sentencePatterns) ? d.sentencePatterns : [],
    quiz: {
      questions: Array.isArray((d.quiz as Record<string, unknown>)?.questions)
        ? ((d.quiz as Record<string, unknown>).questions as { question: string; options: string[]; answer: number }[])
        : [],
    },
  };
}

async function generateOneReading(type: ReadingType, apiKey: string): Promise<Story> {
  const client = new Groq({ apiKey });
  const prompt = buildPromptForType(type);

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
    temperature: 0.8,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  const text = jsonMatch[0].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");

  return validateStory(JSON.parse(text), type);
}

export async function generateDailyReadings(): Promise<Story[]> {
  const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
  const apiKey = process.env.GROQ_API_KEY;
  const today = new Date().toISOString().split("T")[0];

  if (!apiKey) {
    console.error("[generate] GROQ_API_KEY is not set — returning sample stories");
    return types.map((t) => ({ ...getSampleForType(t), date: today }));
  }

  const readings: Story[] = [];
  for (let i = 0; i < types.length; i++) {
    try {
      const story = await generateOneReading(types[i], apiKey);
      readings.push({ ...story, date: today });
    } catch (err) {
      console.error(`[generate] Failed to generate "${types[i]}":`, err);
      readings.push({ ...getSampleForType(types[i]), date: today });
    }
  }
  return readings;
}
