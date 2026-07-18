# German content generation: prompt architecture

This documents the pipeline that generates daily readings (`news`, `dialogue`,
`story`, `speaking`) via the OpenAI API. It does not cover the preposition
exercise generator (`lib/prepositionPrompt.ts` / `lib/prepositions.server.ts`),
which is a separate, simpler pipeline with its own well-tested prompt.

## Why multiple AI stages exist

A single prompt that simultaneously writes natural German, hits a word
count, covers a specific list of grammar features, *and* self-reports which
of those features it used competes with itself — a model asked to "sound
natural" and "prove you used Passiv and Konjunktiv II" resolves the conflict
by forcing grammar into places a native speaker wouldn't naturally put it,
and self-reported metadata drifts from what the text actually contains (a
concrete case that shipped here: the speaking prompt told the model to use
Konjunktiv II while the JSON schema's own template hardcoded
`konjunktivII: false`).

Splitting into single-responsibility stages removes that self-grading
conflict, and lets each stage use the model/temperature that actually suits
its job instead of one compromise setting for everything.

## Why generation and analysis are separated

The generator's only job is to produce natural German. The analysis stage's
only job is to read the *finished* text and report which grammar features
are actually present in it — it never generates or judges quality, only
classifies. This means `grammarChecklist` is now a **report**, not a
**target**: the generator is never shown the checklist schema at all (see
`JSON_TEMPLATE` in `lib/storyPrompt.ts`), so it has no way to write toward or
contradict it.

## Pipeline

```
Prompt Builder                lib/storyPrompt.ts: buildPromptForType(type, topicOverride?)
        │
        ▼
Generator                     runGenerationCall()        [1st OpenAI call]
                               writes natural German, nothing else
        │
        ▼
                               validateStory()            structural validation only
        │
        ▼
Native German Reviewer        runReviewPass()             [2nd OpenAI call]
                               edits only what sounds unnatural; grades what
                               it hands back (see Quality score below);
                               fails soft (keeps original text) on error
        │
        ▼
Validator                     validateContentQuality()    fast, non-LLM checks:
                                                           empty text, duplicated
                                                           paragraphs, malformed
                                                           "Name: text" dialogue
                                                           — runs BEFORE analysis
                                                           so a bad review never
                                                           burns an analysis call
        │
        ▼
Grammar Analyzer              runAnalysisPass()           [3rd OpenAI call]
                               reports which grammar features are actually
                               present in the final text; fails soft to an
                               all-false checklist on error
        │
        ▼
Vocabulary Analyzer (optional) runVocabularyPass()        [4th OpenAI call,
                               off by default — ENABLE_VOCABULARY_ANALYSIS]
                               flags vocabulary outside the stated CEFR level;
                               logs a warning only, never blocks
        │
        ▼
Frontend                      Story JSON, cached to Vercel Blob
```

The **Validator moved** from after the analyzer (in the previous pass) to
before it. Rationale: it's a free, local, synchronous check — the cheapest
place in the whole pipeline to catch a degenerate generation (empty text,
looping paragraphs, broken dialogue format) is before spending another
OpenAI call analyzing text that's about to be discarded anyway.

Each reading `type` runs this full sequence; the 4 types
(`news`/`dialogue`/`story`/`speaking`) still run in parallel with each other
via `Promise.allSettled` in `_generateDailyReadings`. If the whole sequence
throws, that one type falls back to the hand-written sample in
`lib/sampleStories.ts`. The review, analysis, and vocabulary passes fail soft
internally instead — a hiccup in editing, grammar-tagging, or vocabulary
checking never throws away an otherwise-good generation.

## Model strategy

Model selection is per-stage and configurable via environment variables —
never hardcoded. See `lib/aiConfig.server.ts`.

| Stage | Env var | Default | Quality needs | Reasoning needs | Latency budget | Cost weight |
|---|---|---|---|---|---|---|
| Generation | `GENERATION_MODEL` | `gpt-4o-mini` | High — this is the actual content learners read | High — creativity, CEFR judgment, register control | Largest single call (longest output) | Highest — longest output, so the most expensive stage per call |
| Review | `REVIEW_MODEL` | `gpt-4o-mini` | High — this is the last line of defense on naturalness | Medium — needs to *judge* idiomatic vs. merely-grammatical, but doesn't need to invent content | Similar length to generation | Similar to generation (echoes ~the same token volume) |
| Analysis | `ANALYSIS_MODEL` | `gpt-4o-mini` | Low — a wrong boolean here is a metadata blemish, not a bad reading | Low — pattern recognition against a fixed feature list | Small, short output | Low — tiny `max_tokens: 300` |
| Vocabulary (optional) | `VOCABULARY_MODEL` | `gpt-4o-mini` | Low-medium | Low | Small | Low |

Defaults preserve current behavior (all stages on `gpt-4o-mini`, zero cost
change unless you opt in). Worth trialing: raising `GENERATION_MODEL` to a
stronger model, since this codebase already has first-party evidence that
`gpt-4o-mini` can misjudge German grammar (`lib/prepositionPrompt.ts`'s
comment about it marking "zu das Büro" as correct). That evidence is about
grammar *judgment*, which is why Review is the second candidate to upgrade
if Generation alone doesn't close the gap — Review is explicitly a judgment
task (grammatical vs. idiomatic vs. natural vs. frequent vs. register-
appropriate), not just a rewrite task.

## Temperature strategy

Also per-stage and configurable (`GENERATION_TEMPERATURE`,
`REVIEW_TEMPERATURE`, `ANALYSIS_TEMPERATURE`, `VOCABULARY_TEMPERATURE`),
clamped to `[0, 2]` with fallback to the default if unset or invalid.

- **Generation — 0.65**: optimizes for naturalness, consistency, and
  educational quality over raw creativity. Lowered from an original 0.8:
  at that temperature the model reached for rarer, lower-frequency
  collocations more often than the natural default — the opposite of what a
  language-learning corpus should model. Topic/scenario diversity already
  comes from the deterministic daily rotation, not from sampling, so a lower
  temperature doesn't cost variety.
- **Review — 0.3**: deterministic editing. A copy-editing pass shouldn't be
  creative — low temperature keeps corrections conservative and repeatable.
- **Analysis — 0.1**: deterministic classification. This is pattern
  recognition against a fixed list of grammar features, not a task that
  benefits from any sampling variety.
- **Vocabulary — 0.1**: same reasoning as analysis.

## Native speaker review improvements

The reviewer's system prompt (`lib/prompts/reviewPrompt.ts`) now explicitly
separates five independent axes instead of a single natural/unnatural
judgment:

- **grammatically correct** — free of case/agreement/word-order errors
- **idiomatic** — uses the fixed expressions natives actually use, even when
  a literal alternative is also grammatically valid
- **natural** — sounds like something a real person would actually say
- **frequent** — the phrasing you'd expect most often in native usage, not a
  rarer/marked alternative
- **appropriate register** — formality matches the scenario

The prompt states directly that a sentence can be 100% grammatically correct
and still fail on naturalness, frequency, or register, and that the reviewer
must always prefer what a native speaker would actually say over what is
merely grammatically acceptable.

## Quality score (internal only)

The review stage also grades the text it hands back on 8 dimensions —
`grammar`, `naturalness`, `idiomaticity`, `pragmatics`, `register`,
`cefrConsistency`, `translationInterference` (inverted: lower is better),
and `confidence` — each `0.0`–`1.0` (see `QualityScore` in `lib/types.ts`).

**This is never attached to a `Story` object or returned by the API.** It
flows through two internal-only channels:
1. `lib/promptDebugLog.server.ts`, gated by `DEBUG_PROMPT_LOGGING` (off by
   default).
2. The live prompt regression suite (`tests/prompts/liveGeneration.test.ts`),
   which asserts on it directly via `generateOneReadingWithDiagnostics()`.

Frontend behavior is unchanged — no UI reads or ever will read this field
through the public `Story` shape.

## Prompt versioning

Every generated `Story` carries an optional `meta` field
(`Story["meta"]` / `PipelineMeta` in `lib/types.ts`):

```ts
{
  promptVersion: "2.0.0",       // lib/prompts/shared.ts — bump on prompt edits
  generationModel: "gpt-4o-mini",
  reviewModel: "gpt-4o-mini",
  analysisModel: "gpt-4o-mini",
  generationTemperature: 0.65,
  reviewTemperature: 0.3,
  analysisTemperature: 0.1,
  generatedAt: "2026-07-18T12:00:00.000Z",
}
```

Unlike the quality score, this is deliberately *not* internal-only — it's
low-risk provenance data (which prompt/model/temperature produced this
artifact), and being visible in the cached JSON is what makes it possible to
correlate a quality regression with a specific prompt or model change later,
even for a reading generated days ago. `meta` is optional so existing/sample
`Story` objects without it (e.g. `lib/sampleStories.ts`) remain valid.

## Prompt regression tests

Two tiers, under `tests/prompts/`:

- **Deterministic (`npm test`, runs in CI, no network, no cost)**:
  `promptBuilders.test.ts` asserts every `build*Prompt()` includes the
  shared rule blocks, never re-introduces the `grammarChecklist`/
  `konjunktivII` self-report contradiction, and correctly honors
  `topicOverride`. `goldenExamples.test.ts` asserts golden fixtures never
  leak into a production style anchor.
- **Live (`npm run test:live`, opt-in, costs real API usage)**:
  `liveGeneration.test.ts` runs the full generate → review → analyze
  pipeline for the 10 representative scenarios in `scenarios.ts` (hotel,
  restaurant, shopping, doctor, travel, school, phone call, job interview,
  friend conversation, family conversation) via `topicOverride`, and fails
  if the JSON is invalid, the dialogue format is broken, or the review
  quality score drops below a lenient threshold (`0.6`). Skipped entirely
  unless `RUN_LIVE_PROMPT_TESTS=true` and `OPENAI_API_KEY` are both set —
  never runs by accident.

## Golden examples

`tests/prompts/goldenExamples.ts` holds hand-vetted natural German reference
passages (hotel, restaurant, doctor, job interview). They exist only as a
human-reference point for calibrating "what good looks like" and as fixtures
for the leak-detection test above. **Never imported by any production code
path** — `lib/storyPrompt.ts` has its own, separate style-anchor excerpts
(`DIALOGUE_STYLE_EXCERPT` etc.) that are deliberately different text.

## Debug logging

Set `DEBUG_PROMPT_LOGGING=true` to have every stage (`generate` / `review` /
`analyze` / `vocabulary`) log its exact system prompt, user prompt, raw
model output, call duration, and token usage via
`lib/promptDebugLog.server.ts`. A pipeline-level summary (meta + quality
score + total duration) is also logged once per reading. Disabled by
default — this is meant for capturing real transcripts for future prompt
audits, not for production use.

## Performance notes

From profiling the pipeline structure (not a live load test):

- **Fixed**: `validateContentQuality()` now runs before the analysis call
  (see Pipeline above) instead of after — a broken review result no longer
  burns an extra OpenAI call.
- **Fixed**: all three OpenAI calls (generate/review/analyze) now go through
  one `callChatJson()` helper in `lib/claude.ts` instead of three near-
  identical inline blocks — one place doing message shaping, control-char
  stripping, and `JSON.parse`, not three.
- **By design, not a bug**: each reading type still makes 3 sequential
  OpenAI calls (4 if vocabulary analysis is enabled). This was accepted in
  the previous pass as the cost of separating concerns; `maxDuration` on
  both routes is 120s to give it room. The 4 reading types still run in
  parallel with each other.
- **Not found**: no duplicate prompt construction (each `build*Prompt()` is
  called exactly once per reading), no avoidable serialization beyond the
  necessary one `JSON.parse` per call.

## Extending prompts safely

- New shared principles (apply to every reading type) → add to
  `lib/prompts/shared.ts`, not to an individual `build*Prompt` function.
- New per-type content requirements → edit the relevant `build*Prompt`
  function in `lib/storyPrompt.ts` only.
- New grammar features to track → add them to both the schema comment in
  `lib/prompts/analysisPrompt.ts` and the `Story["grammarChecklist"]` type in
  `lib/types.ts`, and to the boolean-coercion block in `runAnalysisPass()`
  (`lib/claude.ts`) — all three need to agree or the field silently stays
  `false`.
- Never add a field to `JSON_TEMPLATE` that asks the generator to self-report
  something the analysis pass already determines independently — that
  reintroduces the exact contradiction this refactor removed.
- **Bump `PROMPT_VERSION`** in `lib/prompts/shared.ts` whenever prompt
  wording changes meaningfully, so `Story["meta"].promptVersion` stays
  trustworthy for debugging.
- Add the new/changed scenario to `tests/prompts/promptBuilders.test.ts` if
  it changes the shared-rule contract, and to `tests/prompts/scenarios.ts`
  if it's a new representative real-world scenario worth regression-testing
  live.

## Evaluating prompt quality

1. Run `npm test` — the deterministic suite should always pass; a failure
   means a shared rule or the topicOverride contract broke.
2. Run `npm run test:live` (costs real API usage) to exercise all 10
   representative scenarios end to end and check the quality-score gate.
3. Set `DEBUG_PROMPT_LOGGING=true` for a real run (or `test:live`) and
   inspect the logged `qualityScore` per scenario — this is the most direct
   signal of where naturalness is weak, broken down by dimension
   (grammar vs. idiomaticity vs. register, etc.) rather than a single
   pass/fail.
4. For a deeper audit, compare logged outputs against
   `tests/prompts/goldenExamples.ts` by eye — these are not automated
   against each other (no semantic-similarity scoring is implemented), they
   are a manual calibration reference.

## Known limitations / follow-ups

- **Latency/cost**: 3–4 sequential OpenAI calls per reading type. Consider
  this before enabling the optional vocabulary stage broadly.
- **No empirical baseline yet for the `0.6` quality-score test threshold**
  — it's a smoke-test floor, not a calibrated bar. Tighten it once
  `test:live` has run enough times to establish a real baseline.
- **Quality scores don't persist past the request/log** — by design (see
  Quality score above), so if `DEBUG_PROMPT_LOGGING` is off, that run's
  scores are gone once the request completes. If you need queryable
  historical quality scores, that requires a dedicated store — not built
  here to avoid speculative infrastructure.
- **Preposition pipeline untouched** — out of scope both passes; it already
  had strong linguistic scaffolding and doesn't share `lib/prompts/shared.ts`
  yet.
