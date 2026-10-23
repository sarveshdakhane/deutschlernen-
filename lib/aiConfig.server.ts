// Central per-stage model configuration for the generation pipeline. Every
// stage has different quality, reasoning, latency, and cost requirements
// (see docs/prompt-architecture.md), so nothing here is hardcoded in
// lib/claude.ts — it all resolves through here, overridable per environment
// without touching code.
//
// No temperature here — Claude Opus 5 / Sonnet 5 reject non-default
// temperature/top_p/top_k (400). The equivalent lever on Claude is per-stage
// `thinking` (see shouldThinkForStage below), not sampling.

export type PipelineStage = "generation" | "review" | "analysis" | "vocabulary" | "prepositions";

const MODEL_ENV_VARS: Record<PipelineStage, string> = {
  generation: "GENERATION_MODEL",
  review: "REVIEW_MODEL",
  analysis: "ANALYSIS_MODEL",
  vocabulary: "VOCABULARY_MODEL",
  prepositions: "PREPOSITION_MODEL",
};

// Defaults: claude-sonnet-5 everywhere — near-Opus quality on this kind of
// writing/judgment task, at a cost shape closer to this app's original
// cost-conscious per-stage design than Opus would be. Raise any individual
// stage to claude-opus-5 via its env var if quality ever warrants it.
const DEFAULT_MODELS: Record<PipelineStage, string> = {
  generation: "claude-sonnet-5",
  review: "claude-sonnet-5",
  analysis: "claude-sonnet-5",
  vocabulary: "claude-sonnet-5",
  prepositions: "claude-sonnet-5",
};

// Generation/review/prepositions benefit from reasoning (naturalness
// judgment, idiomatic-vs-grammatical calls, grammar correctness). Analysis
// and vocabulary are pure classification against a fixed feature list —
// thinking adds cost and risks eating into their small max_tokens budget
// for no quality benefit, so they run with it explicitly disabled. This is
// the replacement for the old low-temperature "deterministic" stages.
const THINKING_STAGES: Record<PipelineStage, boolean> = {
  generation: true,
  review: true,
  analysis: false,
  vocabulary: false,
  prepositions: true,
};

export function getModelForStage(stage: PipelineStage): string {
  const value = process.env[MODEL_ENV_VARS[stage]];
  return value && value.trim() ? value.trim() : DEFAULT_MODELS[stage];
}

export function shouldThinkForStage(stage: PipelineStage): boolean {
  return THINKING_STAGES[stage];
}

// The vocabulary analyzer is the optional stage in the pipeline diagram —
// off by default so it never adds latency/cost unless explicitly opted in.
export const VOCABULARY_ANALYSIS_ENABLED = process.env.ENABLE_VOCABULARY_ANALYSIS === "true";
