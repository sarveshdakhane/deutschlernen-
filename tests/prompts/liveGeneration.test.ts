import { describe, expect, it } from "vitest";
import { generateOneReadingWithDiagnostics } from "../../lib/claude";
import { REGRESSION_SCENARIOS } from "./scenarios";

// This suite makes real OpenAI API calls (3 per scenario: generate, review,
// analyze) and costs real money, so it is opt-in only — never part of the
// default `npm test` run or CI by default. Run explicitly with:
//   npm run test:live
// which sets RUN_LIVE_PROMPT_TESTS=true. Requires OPENAI_API_KEY.
const apiKey = process.env.OPENAI_API_KEY;
const shouldRun = process.env.RUN_LIVE_PROMPT_TESTS === "true" && !!apiKey;

const suite = shouldRun ? describe : describe.skip;

// Minimum acceptable review quality scores before we consider a generation
// a regression. Deliberately lenient (0.6) — this is a smoke test for
// pipeline health, not a strict quality gate; tighten once there's a real
// baseline of scores to calibrate against.
const MIN_ACCEPTABLE_SCORE = 0.6;

suite("live prompt regression (generate -> review -> analyze)", () => {
  for (const { name, type, topic } of REGRESSION_SCENARIOS) {
    it(
      `produces valid, natural German for "${name}" (${type})`,
      async () => {
        const { story, quality } = await generateOneReadingWithDiagnostics(type, apiKey as string, topic);

        // JSON/structural validity
        expect(story.story.trim().length).toBeGreaterThan(0);
        expect(story.vocabulary.length).toBeGreaterThan(0);
        expect(story.quiz.questions.length).toBeGreaterThan(0);
        expect(story.meta?.promptVersion).toBeTruthy();

        // Dialogue/speaking format sanity (same rule as validateContentQuality)
        if (type === "dialogue" || type === "speaking") {
          const lines = story.story.split("\n").map((l) => l.trim()).filter(Boolean);
          const speakerLines = lines.filter((l) => /^[A-ZÄÖÜ][\wÀ-ÿ.'-]*(?:\s[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*)*:\s+\S/.test(l));
          expect(speakerLines.length / lines.length).toBeGreaterThanOrEqual(0.4);
        }

        // Quality gate — skip gracefully if the review pass itself failed
        // soft (no score returned) rather than failing the whole scenario
        // over a transient reviewer-call error.
        if (quality) {
          expect(quality.grammar).toBeGreaterThanOrEqual(MIN_ACCEPTABLE_SCORE);
          expect(quality.naturalness).toBeGreaterThanOrEqual(MIN_ACCEPTABLE_SCORE);
          expect(quality.confidence).toBeGreaterThanOrEqual(0.4);
        }
      },
      60_000 // 3 sequential OpenAI calls — needs real headroom
    );
  }
});
