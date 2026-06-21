import OpenAI from "openai";
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
    imageKeyword: d.imageKeyword ? String(d.imageKeyword) : undefined,
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
  const client = new OpenAI({ apiKey });
  const prompt = buildPromptForType(type);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const text = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");

  return validateStory(JSON.parse(text), type);
}

async function fetchPixabayImage(topic: string): Promise<string | undefined> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return undefined;

  try {
    const query = encodeURIComponent(topic);
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5&min_width=800`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json() as { hits?: { webformatURL: string }[] };
    return data.hits?.[0]?.webformatURL;
  } catch {
    return undefined;
  }
}

export async function generateDailyReadings(): Promise<Story[]> {
  const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
  const apiKey = process.env.OPENAI_API_KEY;
  const today = new Date().toISOString().split("T")[0];

  if (!apiKey) {
    console.log("[generate] No OPENAI_API_KEY — using static dev stories (no API call made)");
    const devStories = types.map((t) => ({ ...getSampleForType(t), date: today }));
    await Promise.all(
      devStories.map(async (story) => {
        story.imageUrl = await fetchPixabayImage(story.imageKeyword ?? story.topic);
      })
    );
    return devStories;
  }

  const results = await Promise.allSettled(
    types.map(async (type) => {
      const story = await generateOneReading(type, apiKey);
      const imageUrl = await fetchPixabayImage(story.imageKeyword ?? story.topic);
      return { ...story, date: today, imageUrl };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[generate] Failed to generate "${types[i]}":`, result.reason);
    return { ...getSampleForType(types[i]), date: today };
  });
}
