import Anthropic from "@anthropic-ai/sdk";
import { PrepositionQuestion } from "./types";
import { buildPrepositionPrompt } from "./prepositionPrompt";
import { samplePrepositionQuestions } from "./samplePrepositions";
import { getModelForStage, shouldThinkForStage } from "./aiConfig.server";

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

async function generateFromClaude(apiKey: string): Promise<PrepositionQuestion[]> {
  const client = new Anthropic({ apiKey });
  const model = getModelForStage("prepositions");
  const thinking = shouldThinkForStage("prepositions");

  // This feature's correct answer is the entire point of the exercise, so
  // model choice here matters more than cost — see PREPOSITION_MODEL in
  // lib/aiConfig.server.ts if grammar-judgment issues ever reappear (the
  // gpt-4o-mini-era predecessor of this prompt was observed marking
  // grammatically wrong options as correct, e.g. "zu das Büro").
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    ...(thinking ? {} : { thinking: { type: "disabled" as const } }),
    messages: [{ role: "user", content: buildPrepositionPrompt() }],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const raw = textBlock?.text ?? "";
  const text = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").trim();
  return validateQuestions(JSON.parse(text));
}

// Concurrency dedup lives in GenerationCoordinatorDO (workers/generationCoordinator.ts)
// now, not here — see the comment on generateDailyReadingsCore in lib/claude.ts
// for why a module-level Map isn't a correct dedup mechanism on Workers.
export async function generateDailyPrepositionsCore(): Promise<PrepositionQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("[prepositions] No ANTHROPIC_API_KEY — using static dev sample (no API call made)");
    return samplePrepositionQuestions;
  }

  try {
    return await generateFromClaude(apiKey);
  } catch (err) {
    console.error("[prepositions] generation failed, falling back to sample:", err);
    return samplePrepositionQuestions;
  }
}
