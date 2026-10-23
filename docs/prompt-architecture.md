# German content generation: prompt architecture

This documents the pipeline that generates daily readings (`news`, `dialogue`,
`story`, `speaking`) via the Claude API. It does not cover the preposition
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
conflict, and lets each stage use the model and reasoning depth that
actually suits its job instead of one compromise setting for everything.

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
Notion (optional, both fail soft)
  topic queue                 lib/notion.server.ts: queryQueuedEntry(type)
                               oldest "Ready" row for this type, if any
  vocabulary recap            lib/vocabCooldown.server.ts: pickVocabularyForReading()
                               words from the Vocab page not in cooldown
        │
        ▼
Prompt Builder                lib/storyPrompt.ts: buildPromptForType(type, topicOverride?, targetVocabulary?)
        │
        ▼
Generator                     runGenerationCall()        [1st Claude call]
                               writes natural German, nothing else
        │
        ▼
                               validateStory()            structural validation only
        │
        ▼
Native German Reviewer        runReviewPass()             [2nd Claude call]
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
Grammar Analyzer              runAnalysisPass()           [3rd Claude call]
                               reports which grammar features are actually
                               present in the final text; fails soft to an
                               all-false checklist on error
        │
        ▼
Vocabulary Analyzer (optional) runVocabularyPass()        [4th Claude call,
                               off by default — ENABLE_VOCABULARY_ANALYSIS]
                               flags vocabulary outside the stated CEFR level;
                               logs a warning only, never blocks
        │
        ▼
Frontend                      Story JSON, cached to R2 (lib/storage.server.ts)
```

If a Notion topic entry or vocabulary words were consumed, they're only
recorded (`Ready` → `Used`, or added to the vocabulary cooldown record)
*after* `validateContentQuality()` passes — a failed generation leaves the
topic row `Ready` and the words out of cooldown, so they're retried next
cycle instead of silently lost. See "Notion integration" below.

The **Validator moved** from after the analyzer (in the previous pass) to
before it. Rationale: it's a free, local, synchronous check — the cheapest
place in the whole pipeline to catch a degenerate generation (empty text,
looping paragraphs, broken dialogue format) is before spending another
Claude call analyzing text that's about to be discarded anyway.

Each reading `type` runs this full sequence; the 4 types
(`news`/`dialogue`/`story`/`speaking`) still run in parallel with each other
via `Promise.allSettled` in `_generateDailyReadings`. If the whole sequence
throws, that one type falls back to the hand-written sample in
`lib/sampleStories.ts`. The review, analysis, and vocabulary passes fail soft
internally instead — a hiccup in editing, grammar-tagging, or vocabulary
checking never throws away an otherwise-good generation.

## Notion integration

Two independent, optional Notion sources feed into generation instead of the
deterministic day-indexed rotation hardcoded in `lib/storyPrompt.ts`. Both
fail soft: if the relevant env vars aren't set, or the Notion API call fails
for any reason, the corresponding function returns `null`/`[]` and the
existing deterministic rotation/plain generation takes over exactly as if
the feature didn't exist.

Uses the Notion REST API directly via `fetch` (the `data-sources` query
endpoint, not the deprecated `databases` one, for the topic queue; the
`blocks` children endpoint for the vocabulary page) rather than the
`@notionhq/client` SDK, to avoid an extra dependency and any
Workers-runtime-compat risk for a surface this small.

### Topic queue (`topicOverride`)

A small Notion database ("Deutsch Lernen Content Queue") with three
columns: `Topic` (title), `ReadingType` (select:
`news`/`dialogue`/`story`/`speaking`), `Status` (select: `Ready`/`Used`).
`queryQueuedEntry()` in `lib/notion.server.ts` consumes it FIFO — oldest
`Ready` row per `ReadingType`, sorted by creation time — and
`markEntryUsed()` flips it to `Used` only after that generation succeeds
(see Pipeline above). On failure, the row stays `Ready` for the next cycle.

### Vocabulary targeting (`targetVocabulary`)

Sourced from a completely different kind of Notion content: the user's own
personal "Vocab" page (a regular page, not a database), specifically its
"1. Vocabulary & Expressions" section — a column layout where new words get
appended to category lists (Verben, Nomen, Adjektive & Adverbien, ...) as
the user encounters them while learning. The idea: reading the generated
story becomes an automatic recap of recently-learned vocabulary.

- `lib/notionVocabParser.ts` — pure parsing: walks the section's block tree
  (`fetchVocabularyCategories()` in `lib/notion.server.ts` does the actual
  Notion Blocks API calls), extracting the headword from each
  `"word — meaning"` bullet and grouping by its nearest preceding heading.
  Unit-tested against hand-built fixtures in
  `tests/pipeline/notionVocabParser.test.ts` — no live Notion data touches
  this layer.
- `lib/vocabSelection.ts` — pure selection algorithm
  (`tests/pipeline/vocabSelection.test.ts`): picks words biased toward the
  end of each category's list (most recently added) without excluding older
  entries outright (every word keeps at least 30% of a brand-new word's
  selection weight — recency is a bias, not a filter, so practice still
  spans everything logged, not just the newest handful), and round-robins
  across categories so one large category can't crowd out the smaller ones.
- `lib/vocabCooldown.server.ts` — wires the above to a small R2-backed
  record (`notion-vocab-usage.json`) of which words were recently worked
  into a story, so the same words aren't picked again for about a week.
  Recorded only after generation succeeds, same fail-soft convention as the
  topic queue.

`targetVocabulary` is a capability `topicOverride` didn't have: forcing
specific words into the generated text rather than just steering the topic.
This required one deliberate exception to `NATURAL_GERMAN_RULES`'s "never
force a construction just to show it off" principle —
`buildVocabularyTargetInstruction()` in `lib/prompts/shared.ts` explicitly
tells the generator to adapt the scenario to fit the requested words
naturally, rather than skip them or insert them awkwardly. A cheap local
`.includes()` scan after generation (no extra API call) logs a warning if a
requested word didn't make it into the final text — it never blocks, same
fail-soft philosophy as the rest of the pipeline.

Vocabulary selection runs independently of the topic queue — every
reading, every day, regardless of whether a Notion topic entry exists for
that type — since the point is an ongoing recap, not something tied to a
curated scenario.

## Model strategy

Model selection is per-stage and configurable via environment variables —
never hardcoded. See `lib/aiConfig.server.ts`.

| Stage | Env var | Default | Quality needs | Reasoning needs | Latency budget | Cost weight |
|---|---|---|---|---|---|---|
| Generation | `GENERATION_MODEL` | `claude-sonnet-5` | High — this is the actual content learners read | High — creativity, CEFR judgment, register control | Largest single call (longest output) | Highest — longest output, so the most expensive stage per call |
| Review | `REVIEW_MODEL` | `claude-sonnet-5` | High — this is the last line of defense on naturalness | Medium — needs to *judge* idiomatic vs. merely-grammatical, but doesn't need to invent content | Similar length to generation | Similar to generation (echoes ~the same token volume) |
| Analysis | `ANALYSIS_MODEL` | `claude-sonnet-5` | Low — a wrong boolean here is a metadata blemish, not a bad reading | Low — pattern recognition against a fixed feature list | Small, short output | Low — tiny `max_tokens: 500`, thinking disabled |
| Vocabulary (optional) | `VOCABULARY_MODEL` | `claude-sonnet-5` | Low-medium | Low | Small | Low — thinking disabled |
| Prepositions | `PREPOSITION_MODEL` | `claude-sonnet-5` | High — the correct answer is the entire point of the exercise | Medium — grammar-judgment task | Small, one call/day | Low |

Defaults put every stage on `claude-sonnet-5` — near-Opus quality on this
kind of writing/judgment task, at a cost shape closer to this app's
original cost-conscious per-stage design (previously `gpt-4o-mini` for
most stages) than `claude-opus-5` would be. Raise any individual stage to
`claude-opus-5` via its env var if quality ever warrants it — Review is the
most likely first candidate, since it's explicitly a judgment task
(grammatical vs. idiomatic vs. natural vs. frequent vs.
register-appropriate), not just a rewrite task.

## Thinking strategy

Claude's Sonnet/Opus models reject non-default `temperature`/`top_p`/`top_k`
(`400`), so there's no per-stage sampling knob the way there was on OpenAI.
The replacement lever is `thinking` — adaptive reasoning before the model
answers — controlled per stage by `shouldThinkForStage()` in
`lib/aiConfig.server.ts`:

- **Generation, Review, Prepositions — thinking on** (the default; omitting
  the `thinking` param runs Claude's adaptive thinking). These are judgment
  tasks — naturalness, idiomaticity, grammatical correctness — that benefit
  from reasoning before answering.
- **Analysis, Vocabulary — thinking explicitly disabled**
  (`thinking: { type: "disabled" }`). Both are pure classification against a
  fixed feature list; reasoning adds cost and risks eating into their small
  `max_tokens` budget (500/700) for no quality benefit. This is the direct
  replacement for the old "Analysis/Vocabulary run at low temperature for
  deterministic classification" design — the goal (keep these stages cheap
  and non-creative) is the same, the mechanism changed.

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
  promptVersion: "2.1.0",       // lib/prompts/shared.ts — bump on prompt edits
  generationModel: "claude-sonnet-5",
  reviewModel: "claude-sonnet-5",
  analysisModel: "claude-sonnet-5",
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
  unless `RUN_LIVE_PROMPT_TESTS=true` and `ANTHROPIC_API_KEY` are both set —
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
  burns an extra Claude call.
- **Fixed**: all three Claude calls (generate/review/analyze) now go through
  one `callChatJson()` helper in `lib/claude.ts` instead of three near-
  identical inline blocks — one place doing message shaping, control-char
  stripping, and `JSON.parse`, not three.
- **By design, not a bug**: each reading type still makes 3 sequential
  Claude calls (4 if vocabulary analysis is enabled). This was accepted in
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

- **Latency/cost**: 3–4 sequential Claude calls per reading type. Consider
  this before enabling the optional vocabulary stage broadly.
- **No empirical baseline yet for the `0.6` quality-score test threshold**
  — it's a smoke-test floor, not a calibrated bar. Tighten it once
  `test:live` has run enough times to establish a real baseline.
- **Quality scores don't persist past the request/log** — by design (see
  Quality score above), so if `DEBUG_PROMPT_LOGGING` is off, that run's
  scores are gone once the request completes. If you need queryable
  historical quality scores, that requires a dedicated store — not built
  here to avoid speculative infrastructure.
- **Preposition pipeline's prompt untouched** — out of scope for the prompt
  passes documented above; it already had strong linguistic scaffolding and
  doesn't share `lib/prompts/shared.ts` yet. (Its surrounding generation/
  caching infrastructure *did* move to Cloudflare along with everything
  else — see the Cloudflare migration notes below — only the prompt itself
  in `lib/prepositionPrompt.ts` is unchanged.)
- **Topic queue has no per-day pinning or retry backoff** — it's a plain
  FIFO pool by design (confirmed with the user over per-date pinning). A row
  that keeps failing generation stays `Ready` and gets retried every cycle
  with no backoff; low risk given the pipeline's existing fail-soft fallback
  to `lib/sampleStories.ts`, but worth revisiting if a consistently-broken
  row ever burns API calls in a loop.
- **Vocabulary-page parsing is unit-tested but not live-verified** —
  `fetchVocabularyCategories()` in `lib/notion.server.ts` was built against
  the documented Notion Blocks API shape and tested against hand-built
  fixtures (`tests/pipeline/notionVocabParser.test.ts`), but no
  `NOTION_API_KEY` was available in the environment this was built in to
  run it against the real Vocab page end-to-end. Worth a one-time check
  (watch logs for `[notion] vocabulary fetch error` / `vocabulary section
  heading not found`) once a real integration token is wired up, in case
  the page's actual block structure differs from what was assumed.

## Claude migration notes

The generation pipeline and the preposition generator both moved from the
OpenAI API to the Claude API (`@anthropic-ai/sdk`). Three things changed
beyond the obvious model-string swap:

- **No per-stage temperature.** Claude's current Sonnet/Opus models reject
  non-default `temperature`/`top_p`/`top_k` outright (`400`). The old
  "Temperature strategy" section (generation 0.65, review 0.3, analysis/
  vocabulary 0.1) is gone; `shouldThinkForStage()` in
  `lib/aiConfig.server.ts` is the replacement lever — see "Thinking
  strategy" above.
- **No OpenAI-style JSON mode.** There's no `response_format: {type:
  "json_object"}` equivalent, so `callChatJson()` in `lib/claude.ts` relies
  on what the prompts already said ("Return JSON only. No markdown.") plus
  a defensive ```-fence strip, rather than a server-enforced JSON
  constraint. Every prompt already demanded pure JSON output for other
  reasons (`lib/storyPrompt.ts`'s `JSON_TEMPLATE`), so no prompt wording
  needed to change for this.
- **Audio narration dropped, not ported.** The old pipeline also used
  OpenAI's TTS (`audio.speech.create`) and Whisper transcription
  (`audio.transcriptions.create`) to synthesize each reading's narration
  and derive word-timing data for karaoke-style highlighting during
  playback. Claude has no equivalent API for either, and per-reading
  narration audio was dropped as a feature (not moved to another provider)
  rather than keeping a second AI vendor around for just that one file —
  `lib/audioCache.server.ts` and its two routes are gone, along with the
  `audioUrl`/`audioTimingsUrl` fields on `Story`. The unrelated
  word-pronunciation lookup feature (`/pronounce`, Tatoeba-sourced audio
  clips) is untouched — it never used OpenAI.

## Cloudflare migration notes

The backend moved from Vercel to Cloudflare Workers (via `@opennextjs/cloudflare`)
to fix a concurrency bug, not just to change platforms: `app/api/generate-story/route.ts`,
`app/api/prepositions/route.ts`, `lib/claude.ts`, and `lib/prepositions.server.ts`
used to dedupe concurrent/background generation with module-level `Map`/`Set`
state, which only works within a single server instance — any serverless/edge
platform can and does run many instances concurrently, so two requests landing
on different instances could both trigger a full generation run for the same
date. That's now `GenerationCoordinatorDO` (`workers/generationCoordinator.ts`),
a Durable Object keyed by `${date}:${kind}` — Cloudflare guarantees a single
live instance per key globally, so concurrent requests from any instance
genuinely serialize instead of racing.

Storage moved from Vercel Blob to an R2 bucket (`lib/storage.server.ts`,
same cache-key strings as before). The opportunistic "prefetch tomorrow on
today's traffic" background task is now backed by both a Cloudflare Cron
Trigger (`scheduled()` in `workers/entry.ts`, the primary mechanism) and the
original on-demand fallback (now safe to keep, since it routes through the
same coordinator instead of an in-memory flag).
