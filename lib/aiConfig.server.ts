// Central per-stage model/temperature configuration for the generation
// pipeline. Every stage has different quality, reasoning, latency, and cost
// requirements (see docs/prompt-architecture.md), so nothing here is
// hardcoded in lib/claude.ts — it all resolves through here, overridable
// per environment without touching code.

export type PipelineStage = "generation" | "review" | "analysis" | "vocabulary";

const MODEL_ENV_VARS: Record<PipelineStage, string> = {
  generation: "GENERATION_MODEL",
  review: "REVIEW_MODEL",
  analysis: "ANALYSIS_MODEL",
  vocabulary: "VOCABULARY_MODEL",
};

const TEMPERATURE_ENV_VARS: Record<PipelineStage, string> = {
  generation: "GENERATION_TEMPERATURE",
  review: "REVIEW_TEMPERATURE",
  analysis: "ANALYSIS_TEMPERATURE",
  vocabulary: "VOCABULARY_TEMPERATURE",
};

// Defaults preserve current behavior — all stages on gpt-4o-mini. Raise
// GENERATION_MODEL to a stronger model via env var if you want to trial
// whether that meaningfully improves educational quality; the codebase
// already has first-party evidence (see lib/prepositionPrompt.ts) that mini
// can misjudge German grammar, so this is a reasonable first knob to try.
const DEFAULT_MODELS: Record<PipelineStage, string> = {
  generation: "gpt-4o-mini",
  review: "gpt-4o-mini",
  analysis: "gpt-4o-mini",
  vocabulary: "gpt-4o-mini",
};

// Generation: some sampling diversity helps wording variety (topic/scenario
// diversity already comes from deterministic daily rotation, not sampling).
// Review: a precision editing task — low temperature keeps corrections
// conservative and repeatable. Analysis/vocabulary: classification tasks —
// deliberately near-deterministic.
const DEFAULT_TEMPERATURES: Record<PipelineStage, number> = {
  generation: 0.65,
  review: 0.3,
  analysis: 0.1,
  vocabulary: 0.1,
};

export function getModelForStage(stage: PipelineStage): string {
  const value = process.env[MODEL_ENV_VARS[stage]];
  return value && value.trim() ? value.trim() : DEFAULT_MODELS[stage];
}

export function getTemperatureForStage(stage: PipelineStage): number {
  const raw = process.env[TEMPERATURE_ENV_VARS[stage]];
  if (raw === undefined || raw.trim() === "") return DEFAULT_TEMPERATURES[stage];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : DEFAULT_TEMPERATURES[stage];
}

// The vocabulary analyzer is the optional stage in the pipeline diagram —
// off by default so it never adds latency/cost unless explicitly opted in.
export const VOCABULARY_ANALYSIS_ENABLED = process.env.ENABLE_VOCABULARY_ANALYSIS === "true";
