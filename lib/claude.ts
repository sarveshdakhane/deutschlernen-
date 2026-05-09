import Groq from "groq-sdk";
import { Story } from "./types";
import { buildStoryPrompt } from "./storyPrompt";
import { getSampleStory } from "./sampleStories";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateStory(data: unknown): Story {
  if (typeof data !== "object" || data === null) {
    throw new Error("Response is not an object");
  }
  const d = data as Record<string, unknown>;

  const required = ["title", "date", "topic", "story", "vocabulary", "sentencePatterns", "quiz"];
  for (const field of required) {
    if (!d[field]) throw new Error(`Missing field: ${field}`);
  }

  const slug = d.slug
    ? String(d.slug)
    : slugify(String(d.title)) + "-" + String(d.date).replace(/-/g, "");

  return {
    slug,
    title: String(d.title),
    date: String(d.date),
    topic: String(d.topic),
    difficulty: "B1",
    story: String(d.story),
    grammarChecklist: {
      praesens: true,
      perfekt: true,
      modalverben: true,
      nebensaetze: true,
      relativsaetze: true,
      konjunktivII: true,
      passiv: true,
      ...((d.grammarChecklist as object) ?? {}),
    },
    vocabulary: Array.isArray(d.vocabulary) ? d.vocabulary : [],
    sentencePatterns: Array.isArray(d.sentencePatterns) ? d.sentencePatterns : [],
    quiz: {
      readingQuestions: Array.isArray((d.quiz as Record<string, unknown>)?.readingQuestions)
        ? ((d.quiz as Record<string, unknown>).readingQuestions as string[])
        : [],
      writingPrompts: Array.isArray((d.quiz as Record<string, unknown>)?.writingPrompts)
        ? ((d.quiz as Record<string, unknown>).writingPrompts as string[])
        : [],
    },
  };
}

export async function generateStory(topic?: string): Promise<Story> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return getSampleStory();
  }

  try {
    const client = new Groq({ apiKey });
    const prompt = buildStoryPrompt(topic);

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return validateStory(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("quota") || message.includes("rate") || message.includes("limit")) {
      return getSampleStory();
    }
    throw error;
  }
}
