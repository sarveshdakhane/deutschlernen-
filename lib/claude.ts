import OpenAI from "openai";
import { Story, ReadingType, QualityScore } from "./types";
import { buildPromptForType, GenerationPrompt } from "./storyPrompt";
import { buildReviewSystemPrompt, buildReviewUserPrompt } from "./prompts/reviewPrompt";
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from "./prompts/analysisPrompt";
import { buildVocabularySystemPrompt, buildVocabularyUserPrompt } from "./prompts/vocabPrompt";
import { PROMPT_VERSION } from "./prompts/shared";
import { getModelForStage, getTemperatureForStage, VOCABULARY_ANALYSIS_ENABLED } from "./aiConfig.server";
import { getSampleForType } from "./sampleStories";
import { logPromptDebug, logPipelineSummary, TokenUsage, PromptDebugStage } from "./promptDebugLog.server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_GRAMMAR_CHECKLIST: Story["grammarChecklist"] = {
  praesens: false, perfekt: false, modalverben: false,
  nebensaetze: false, relativsaetze: false, konjunktivII: false, passiv: false,
};

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
    // Placeholder — overwritten by runAnalysisPass() below, which derives
    // this from the final text instead of trusting the writer's self-report
    // (that self-report was the source of an earlier Konjunktiv II
    // contradiction: the generator was told to use it while its own JSON
    // schema hardcoded the checklist flag to false).
    grammarChecklist: { ...DEFAULT_GRAMMAR_CHECKLIST },
    vocabulary: Array.isArray(d.vocabulary) ? d.vocabulary : [],
    sentencePatterns: Array.isArray(d.sentencePatterns) ? d.sentencePatterns : [],
    quiz: {
      questions: Array.isArray((d.quiz as Record<string, unknown>)?.questions)
        ? ((d.quiz as Record<string, unknown>).questions as { question: string; options: string[]; answer: number }[])
        : [],
    },
  };
}

// Fast, non-LLM sanity checks on the final text — catches degenerate
// generations (empty output, looping/duplicated paragraphs, a dialogue that
// doesn't actually follow "Name: text") without spending another API call.
// Deliberately runs BEFORE the grammar-analysis pass (see
// generateOneReadingWithDiagnostics) so a broken review result never burns
// an extra OpenAI call analyzing text that's about to be thrown away.
function validateContentQuality(story: Story, type: ReadingType): void {
  const text = story.story.trim();
  if (!text) throw new Error("Generated story text is empty");

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const seenParagraphs = new Set<string>();
  for (const p of paragraphs) {
    if (p.length < 40) continue; // short lines/greetings legitimately repeat
    const key = p.toLowerCase();
    if (seenParagraphs.has(key)) throw new Error("Generated story contains a duplicated paragraph");
    seenParagraphs.add(key);
  }

  if (type === "dialogue" || type === "speaking") {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const speakerLines = lines.filter((l) => /^[A-ZÄÖÜ][\wÀ-ÿ.'-]*:\s+\S/.test(l));
    if (lines.length > 0 && speakerLines.length / lines.length < 0.4) {
      throw new Error("Generated dialogue does not follow the 'Name: text' speaker format");
    }
  }
}

function stripControlChars(raw: string): string {
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
}

function clampScore(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined;
}

const QUALITY_SCORE_FIELDS = [
  "grammar", "naturalness", "idiomaticity", "pragmatics",
  "register", "cefrConsistency", "translationInterference", "confidence",
] as const;

function parseQualityScore(value: unknown): QualityScore | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const result = {} as QualityScore;
  for (const field of QUALITY_SCORE_FIELDS) {
    const score = clampScore(v[field]);
    if (score === undefined) return undefined;
    result[field] = score;
  }
  return result;
}

// Single choke point for every "send system+user, get JSON back" call in
// the pipeline — avoids re-implementing message shaping, control-char
// stripping, and JSON.parse per stage (previously duplicated 3x).
type ChatJsonResult = {
  raw: unknown;
  rawText: string;
  durationMs: number;
  usage: TokenUsage;
};

async function callChatJson(
  client: OpenAI,
  model: string,
  temperature: number,
  maxTokens: number,
  system: string,
  user: string
): Promise<ChatJsonResult> {
  const start = Date.now();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature,
    response_format: { type: "json_object" },
  });
  const durationMs = Date.now() - start;

  const rawText = stripControlChars(completion.choices[0]?.message?.content ?? "");
  const usage: TokenUsage = {
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
    totalTokens: completion.usage?.total_tokens,
  };

  return { raw: JSON.parse(rawText), rawText, durationMs, usage };
}

function logStage(type: ReadingType, stage: PromptDebugStage, system: string, user: string, result: ChatJsonResult): void {
  logPromptDebug({
    type, stage, system, user,
    output: result.rawText,
    durationMs: result.durationMs,
    usage: result.usage,
  });
}

async function runGenerationCall(client: OpenAI, type: ReadingType, prompt: GenerationPrompt): Promise<unknown> {
  const model = getModelForStage("generation");
  const temperature = getTemperatureForStage("generation");
  const result = await callChatJson(client, model, temperature, 4096, prompt.system, prompt.user);
  logStage(type, "generate", prompt.system, prompt.user, result);
  return result.raw;
}

// Native-speaker editor pass: fixes only what sounds wrong, never rewrites
// wholesale, and grades the text it hands back. Fails soft — if this call
// errors or returns something unusable, we keep the original generated text
// (and no quality score) rather than losing the whole reading over an
// editing-step failure.
async function runReviewPass(
  client: OpenAI,
  type: ReadingType,
  difficulty: "A2" | "B1",
  text: string
): Promise<{ text: string; quality?: QualityScore }> {
  const system = buildReviewSystemPrompt();
  const user = buildReviewUserPrompt(text, type, difficulty);
  const model = getModelForStage("review");
  const temperature = getTemperatureForStage("review");

  try {
    const result = await callChatJson(client, model, temperature, 4096, system, user);
    logStage(type, "review", system, user, result);

    const parsed = result.raw as { text?: unknown; qualityScore?: unknown };
    const reviewed = typeof parsed.text === "string" ? parsed.text.trim() : "";
    return { text: reviewed || text, quality: parseQualityScore(parsed.qualityScore) };
  } catch (err) {
    console.error(`[review] pass failed for "${type}", keeping original text:`, err);
    return { text };
  }
}

// Grammar-analysis pass: reports which features are present in the FINAL
// (post-review) text. This is what fills grammarChecklist now — the
// generator itself is never asked to self-report it. Fails soft to an
// all-false checklist rather than failing the whole reading.
async function runAnalysisPass(
  client: OpenAI,
  type: ReadingType,
  text: string
): Promise<Story["grammarChecklist"]> {
  const system = buildAnalysisSystemPrompt();
  const user = buildAnalysisUserPrompt(text);
  const model = getModelForStage("analysis");
  const temperature = getTemperatureForStage("analysis");

  try {
    const result = await callChatJson(client, model, temperature, 300, system, user);
    logStage(type, "analyze", system, user, result);

    const parsed = result.raw as Record<string, unknown>;
    return {
      praesens: Boolean(parsed.praesens),
      perfekt: Boolean(parsed.perfekt),
      modalverben: Boolean(parsed.modalverben),
      nebensaetze: Boolean(parsed.nebensaetze),
      relativsaetze: Boolean(parsed.relativsaetze),
      konjunktivII: Boolean(parsed.konjunktivII),
      passiv: Boolean(parsed.passiv),
    };
  } catch (err) {
    console.error(`[analysis] pass failed for "${type}", using default checklist:`, err);
    return { ...DEFAULT_GRAMMAR_CHECKLIST };
  }
}

// Optional vocabulary-analyzer stage — off unless ENABLE_VOCABULARY_ANALYSIS
// is set. Only flags mismatches (logged as a warning); it never blocks or
// alters the reading, so leaving it disabled is always safe.
async function runVocabularyPass(
  client: OpenAI,
  type: ReadingType,
  story: Story
): Promise<{ appropriate: boolean; flagged: string[] } | undefined> {
  if (!VOCABULARY_ANALYSIS_ENABLED) return undefined;

  const system = buildVocabularySystemPrompt();
  const user = buildVocabularyUserPrompt(story.vocabulary, story.difficulty);
  const model = getModelForStage("vocabulary");
  const temperature = getTemperatureForStage("vocabulary");

  try {
    const result = await callChatJson(client, model, temperature, 500, system, user);
    logStage(type, "vocabulary", system, user, result);

    const parsed = result.raw as { appropriate?: unknown; flagged?: unknown };
    return {
      appropriate: Boolean(parsed.appropriate),
      flagged: Array.isArray(parsed.flagged) ? parsed.flagged.map(String) : [],
    };
  } catch (err) {
    console.error(`[vocabulary] pass failed for "${type}", skipping:`, err);
    return undefined;
  }
}

export type PipelineResult = { story: Story; quality?: QualityScore };

// The full pipeline: Prompt Builder -> Generator -> Native German Reviewer
// -> Validator -> Grammar Analyzer -> Vocabulary Analyzer (optional).
// Validator runs right after the reviewer and before the grammar analyzer
// on purpose: it's a free, local check, so it's the cheapest place to catch
// a degenerate generation before spending another OpenAI call analyzing it.
//
// `topicOverride` lets callers (currently the prompt regression tests)
// force a specific scenario/topic instead of the deterministic daily
// rotation — production code never passes it.
export async function generateOneReadingWithDiagnostics(
  type: ReadingType,
  apiKey: string,
  topicOverride?: string
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const client = new OpenAI({ apiKey });
  const prompt = buildPromptForType(type, topicOverride);

  const generationModel = getModelForStage("generation");
  const reviewModel = getModelForStage("review");
  const analysisModel = getModelForStage("analysis");
  const generationTemperature = getTemperatureForStage("generation");
  const reviewTemperature = getTemperatureForStage("review");
  const analysisTemperature = getTemperatureForStage("analysis");

  // 1. Generate — the writer's only job is natural German, nothing else.
  const draft = await runGenerationCall(client, type, prompt);
  const story = validateStory(draft, type);

  // 2. Review — a native-speaker editor fixes only what sounds wrong, and
  //    grades the result.
  const review = await runReviewPass(client, type, story.difficulty, story.story);
  story.story = review.text;

  // 3. Validate — cheap structural/content sanity checks, no extra API call.
  validateContentQuality(story, type);

  // 4. Analyze — determine grammarChecklist from the final text.
  story.grammarChecklist = await runAnalysisPass(client, type, story.story);

  // 5. Vocabulary analyzer (optional, off by default).
  const vocabResult = await runVocabularyPass(client, type, story);
  if (vocabResult && !vocabResult.appropriate) {
    console.warn(`[vocabulary] "${type}" flagged words outside ${story.difficulty} level:`, vocabResult.flagged);
  }

  story.meta = {
    promptVersion: PROMPT_VERSION,
    generationModel,
    reviewModel,
    analysisModel,
    generationTemperature,
    reviewTemperature,
    analysisTemperature,
    generatedAt: new Date().toISOString(),
  };

  logPipelineSummary({
    type,
    meta: story.meta,
    quality: review.quality,
    totalDurationMs: Date.now() - pipelineStart,
  });

  return { story, quality: review.quality };
}

async function generateOneReading(type: ReadingType, apiKey: string): Promise<Story> {
  return (await generateOneReadingWithDiagnostics(type, apiKey)).story;
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

// Per-instance promise cache — if two requests hit the same cold instance before
// unstable_cache propagates, they share one Promise and one OpenAI call.
const inflightByDate = new Map<string, Promise<Story[]>>();

export function generateDailyReadings(date?: string): Promise<Story[]> {
  const targetDate = date ?? new Date().toISOString().split("T")[0];

  const inflight = inflightByDate.get(targetDate);
  if (inflight) return inflight;

  const promise = _generateDailyReadings(targetDate);
  inflightByDate.set(targetDate, promise);
  // Clean up after settling so the Map doesn't grow forever
  promise.finally(() => inflightByDate.delete(targetDate));
  return promise;
}

async function _generateDailyReadings(targetDate: string): Promise<Story[]> {
  const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[generate] No OPENAI_API_KEY — using static dev stories (no API call made)");
    const devStories = types.map((t) => ({ ...getSampleForType(t), date: targetDate }));
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
      return { ...story, date: targetDate, imageUrl };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[generate] Failed to generate "${types[i]}":`, result.reason);
    return { ...getSampleForType(types[i]), date: targetDate };
  });
}
