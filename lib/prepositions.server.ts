import OpenAI from "openai";
import { PrepositionQuestion } from "./types";
import { buildPrepositionPrompt } from "./prepositionPrompt";
import { samplePrepositionQuestions } from "./samplePrepositions";

function validateQuestions(data: unknown): PrepositionQuestion[] {
  if (typeof data !== "object" || data === null) throw new Error("Response is not an object");
  const questions = (data as Record<string, unknown>).questions;
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("Missing questions array");

  return questions.map((q, i) => {
    if (typeof q !== "object" || q === null) throw new Error(`Question ${i} is not an object`);
    const item = q as Record<string, unknown>;

    const sentence = String(item.sentence ?? "");
    if (!sentence.includes("___")) throw new Error(`Question ${i} is missing a "___" blank`);

    const options = Array.isArray(item.options) ? item.options.map(String) : [];
    if (options.length !== 4) throw new Error(`Question ${i} does not have exactly 4 options`);

    const answer = Number(item.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      throw new Error(`Question ${i} has an invalid answer index`);
    }

    return { sentence, options, answer, translation: String(item.translation ?? "") };
  });
}

async function generateFromOpenAI(apiKey: string): Promise<PrepositionQuestion[]> {
  const client = new OpenAI({ apiKey });

  // Uses the full gpt-4o model (not the -mini variant used elsewhere in this app)
  // because this feature's correct answer is the entire point of the exercise —
  // mini was observed marking grammatically wrong options as correct (e.g. "zu das
  // Büro"). It's one cached call per day, so the extra cost is negligible.
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: buildPrepositionPrompt() }],
    max_tokens: 2048,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const text = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
  return validateQuestions(JSON.parse(text));
}

// Per-instance promise cache — if two requests hit the same cold instance before
// the blob cache propagates, they share one Promise and one OpenAI call.
const inflightByDate = new Map<string, Promise<PrepositionQuestion[]>>();

export function generateDailyPrepositions(date?: string): Promise<PrepositionQuestion[]> {
  const targetDate = date ?? new Date().toISOString().split("T")[0];

  const inflight = inflightByDate.get(targetDate);
  if (inflight) return inflight;

  const promise = _generateDailyPrepositions();
  inflightByDate.set(targetDate, promise);
  promise.finally(() => inflightByDate.delete(targetDate));
  return promise;
}

async function _generateDailyPrepositions(): Promise<PrepositionQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[prepositions] No OPENAI_API_KEY — using static dev sample (no API call made)");
    return samplePrepositionQuestions;
  }

  try {
    return await generateFromOpenAI(apiKey);
  } catch (err) {
    console.error("[prepositions] generation failed, falling back to sample:", err);
    return samplePrepositionQuestions;
  }
}
