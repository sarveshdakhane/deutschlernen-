import Anthropic from "@anthropic-ai/sdk";
import { Story, ReadingType, QualityScore } from "./types";
import { buildPromptForType, GenerationPrompt } from "./storyPrompt";
import { buildReviewSystemPrompt, buildReviewUserPrompt } from "./prompts/reviewPrompt";
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from "./prompts/analysisPrompt";
import { buildVocabularySystemPrompt, buildVocabularyUserPrompt } from "./prompts/vocabPrompt";
import { PROMPT_VERSION } from "./prompts/shared";
import { getModelForStage, shouldThinkForStage, VOCABULARY_ANALYSIS_ENABLED } from "./aiConfig.server";
import { getSampleForType } from "./sampleStories";
import { logPromptDebug, logPipelineSummary, TokenUsage, PromptDebugStage } from "./promptDebugLog.server";
import { queryQueuedEntry, markEntryUsed } from "./notion.server";
import { pickVocabularyForReading, recordVocabularyUsed } from "./vocabCooldown.server";

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
// an extra Claude API call analyzing text that's about to be thrown away.
// Exported for tests/pipeline/contentValidation.test.ts — this exact
// function silently rejected valid dialogue using titled German names
// ("Frau Berg:", "Herr Klein:") in production before the regex was fixed,
// causing those reading types to fall back to the static sample story.
export function validateContentQuality(story: Story, type: ReadingType): void {
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
    // Matches "Mia:" as well as multi-word/titled names like "Frau Berg:",
    // "Herr Klein:", "Dr. Fischer:" — the original single-word version
    // rejected any titled name, which is common in exactly the scenarios
    // (hotel, pharmacy, doctor's office) this app generates.
    const speakerLines = lines.filter((l) => /^[A-ZÄÖÜ][\wÀ-ÿ.'-]*(?:\s[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*)*:\s+\S/.test(l));
    if (lines.length > 0 && speakerLines.length / lines.length < 0.4) {
      throw new Error("Generated dialogue does not follow the 'Name: text' speaker format");
    }
  }
}

function stripControlChars(raw: string): string {
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
}

// Claude reliably follows the prompts' existing "Return JSON only. No
// markdown." instruction, but strips a defensive ```-fence just in case —
// cheap insurance against an occasional wrapped response, not something the
// prompts currently need to ask for.
function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
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
  client: Anthropic,
  model: string,
  thinking: boolean,
  maxTokens: number,
  system: string,
  user: string
): Promise<ChatJsonResult> {
  const start = Date.now();
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    // Omitting `thinking` runs Claude's adaptive thinking by default; pass
    // `disabled` for stages that are pure classification and don't benefit
    // from reasoning (see shouldThinkForStage in lib/aiConfig.server.ts).
    ...(thinking ? {} : { thinking: { type: "disabled" as const } }),
    messages: [{ role: "user", content: user }],
  });
  const durationMs = Date.now() - start;

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const rawText = stripMarkdownFence(stripControlChars(textBlock?.text ?? ""));
  const usage: TokenUsage = {
    promptTokens: message.usage.input_tokens,
    completionTokens: message.usage.output_tokens,
    totalTokens: message.usage.input_tokens + message.usage.output_tokens,
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

async function runGenerationCall(client: Anthropic, type: ReadingType, prompt: GenerationPrompt): Promise<unknown> {
  const model = getModelForStage("generation");
  const thinking = shouldThinkForStage("generation");
  const result = await callChatJson(client, model, thinking, 8192, prompt.system, prompt.user);
  logStage(type, "generate", prompt.system, prompt.user, result);
  return result.raw;
}

// Native-speaker editor pass: fixes only what sounds wrong, never rewrites
// wholesale, and grades the text it hands back. Fails soft — if this call
// errors or returns something unusable, we keep the original generated text
// (and no quality score) rather than losing the whole reading over an
// editing-step failure.
async function runReviewPass(
  client: Anthropic,
  type: ReadingType,
  difficulty: "A2" | "B1",
  text: string
): Promise<{ text: string; quality?: QualityScore }> {
  const system = buildReviewSystemPrompt();
  const user = buildReviewUserPrompt(text, type, difficulty);
  const model = getModelForStage("review");
  const thinking = shouldThinkForStage("review");

  try {
    const result = await callChatJson(client, model, thinking, 8192, system, user);
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
  client: Anthropic,
  type: ReadingType,
  text: string
): Promise<Story["grammarChecklist"]> {
  const system = buildAnalysisSystemPrompt();
  const user = buildAnalysisUserPrompt(text);
  const model = getModelForStage("analysis");
  const thinking = shouldThinkForStage("analysis");

  try {
    const result = await callChatJson(client, model, thinking, 500, system, user);
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
  client: Anthropic,
  type: ReadingType,
  story: Story
): Promise<{ appropriate: boolean; flagged: string[] } | undefined> {
  if (!VOCABULARY_ANALYSIS_ENABLED) return undefined;

  const system = buildVocabularySystemPrompt();
  const user = buildVocabularyUserPrompt(story.vocabulary, story.difficulty);
  const model = getModelForStage("vocabulary");
  const thinking = shouldThinkForStage("vocabulary");

  try {
    const result = await callChatJson(client, model, thinking, 700, system, user);
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
// a degenerate generation before spending another Claude API call analyzing it.
//
// `topicOverride` lets callers force a specific scenario/topic instead of
// the deterministic daily rotation — used by the prompt regression tests,
// and in production by the Notion content queue (see queryQueuedEntry in
// generateDailyReadingsCore below). `targetVocabulary`, when present, asks
// the generator to work specific words into the text (see
// buildVocabularyTargetInstruction in lib/prompts/shared.ts).
export async function generateOneReadingWithDiagnostics(
  type: ReadingType,
  apiKey: string,
  topicOverride?: string,
  targetVocabulary?: string[]
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const client = new Anthropic({ apiKey });
  const prompt = buildPromptForType(type, topicOverride, targetVocabulary);

  const generationModel = getModelForStage("generation");
  const reviewModel = getModelForStage("review");
  const analysisModel = getModelForStage("analysis");

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

  // Cheap local check (no extra API call) that requested vocabulary actually
  // made it into the final text — logs a warning only, same fail-soft
  // philosophy as the rest of this pipeline.
  if (targetVocabulary && targetVocabulary.length > 0) {
    const lowerText = story.story.toLowerCase();
    const missing = targetVocabulary.filter((w) => !lowerText.includes(w.toLowerCase()));
    if (missing.length > 0) {
      console.warn(`[vocabulary-target] "${type}" missing requested word(s):`, missing);
    }
  }

  story.meta = {
    promptVersion: PROMPT_VERSION,
    generationModel,
    reviewModel,
    analysisModel,
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

async function generateOneReading(
  type: ReadingType,
  apiKey: string,
  topicOverride?: string,
  targetVocabulary?: string[]
): Promise<Story> {
  return (await generateOneReadingWithDiagnostics(type, apiKey, topicOverride, targetVocabulary)).story;
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

// Concurrency dedup lives in GenerationCoordinatorDO (workers/generationCoordinator.ts)
// now, not here — a Durable Object instance per date+kind is globally unique,
// unlike a module-level Map, which only dedupes requests that happen to land
// on the same Worker isolate. This is the actual generator the coordinator calls.
// `bucket` is only needed for the Notion vocabulary cooldown record
// (lib/vocabCooldown.server.ts) — threaded in by the coordinator, which
// already holds it, rather than reached for via getCloudflareContext() here
// (this module also runs outside any Next.js request context).
export async function generateDailyReadingsCore(targetDate: string, bucket: R2Bucket): Promise<Story[]> {
  const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("[generate] No ANTHROPIC_API_KEY — using static dev stories (no API call made)");
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
      // Notion-sourced topic takes priority over the deterministic
      // day-indexed rotation when a "Ready" queue entry exists for this
      // type; vocabulary is sourced independently from the Vocab page's
      // word pool (lib/vocabCooldown.server.ts) regardless of whether a
      // topic entry exists. Both are only marked "used" once generation +
      // image fetch actually succeed — on failure, Promise.allSettled
      // catches the rejection below and the topic row stays "Ready" /
      // the words stay out of cooldown for the next cycle to retry.
      const queued = await queryQueuedEntry(type);
      const vocabWords = await pickVocabularyForReading(bucket);
      const story = await generateOneReading(
        type,
        apiKey,
        queued?.topic,
        vocabWords.length > 0 ? vocabWords : undefined
      );
      const imageUrl = await fetchPixabayImage(story.imageKeyword ?? story.topic);
      if (queued) await markEntryUsed(queued.pageId);
      await recordVocabularyUsed(bucket, vocabWords);
      return { ...story, date: targetDate, imageUrl };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[generate] Failed to generate "${types[i]}":`, result.reason);
    return { ...getSampleForType(types[i]), date: targetDate };
  });
}
