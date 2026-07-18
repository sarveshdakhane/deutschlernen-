// Opt-in debug logging for the generation/review/analysis pipeline.
// Disabled by default — set DEBUG_PROMPT_LOGGING=true to capture the exact
// system prompt, user prompt, raw model output, timing, and token usage for
// every stage, useful for future prompt audits without having to reproduce
// a run blind.

const ENABLED = process.env.DEBUG_PROMPT_LOGGING === "true";

export type PromptDebugStage = "generate" | "review" | "analyze" | "vocabulary";

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type PromptDebugEntry = {
  type: string;
  stage: PromptDebugStage;
  system: string;
  user: string;
  output: string;
  durationMs?: number;
  usage?: TokenUsage;
};

export function logPromptDebug(entry: PromptDebugEntry): void {
  if (!ENABLED) return;
  const tag = `[prompt-debug] ${entry.type}/${entry.stage} (${entry.durationMs ?? "?"}ms, tokens=${entry.usage?.totalTokens ?? "?"})`;
  console.log(tag, JSON.stringify(entry, null, 2));
}

export type PipelineSummary = {
  type: string;
  meta: Record<string, unknown>;
  quality?: Record<string, unknown>;
  totalDurationMs: number;
};

export function logPipelineSummary(summary: PipelineSummary): void {
  if (!ENABLED) return;
  console.log(`[prompt-debug] ${summary.type}/summary`, JSON.stringify(summary, null, 2));
}
