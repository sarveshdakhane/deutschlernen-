import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks the Anthropic SDK entirely so these tests cost nothing and never
// touch the network — contrast with tests/prompts/liveGeneration.test.ts,
// which makes real calls and is opt-in only. This file specifically
// exercises generateOneReadingWithDiagnostics' bounded-retry behavior
// (section 6 / 7.10 of the brief: "failed generation preserves existing
// fallback behavior", "apply bounded retries, not an unlimited loop").
const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
      constructor(_opts: unknown) {
        void _opts;
      }
    },
  };
});

const { generateOneReadingWithDiagnostics } = await import("../../lib/claude");

function message(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 5, output_tokens: 5 },
  };
}

const VALID_DRAFT = {
  title: "Ein Titel",
  date: "2026-10-23",
  topic: "Ein Thema",
  imageKeyword: "test",
  difficulty: "B1",
  readingType: "story",
  story: "Das ist ein Satz.\n\nDas ist noch ein Satz.",
  vocabulary: [{ word: "ein Wort", meaning: "a word", example: "Das ist ein Wort." }],
  sentencePatterns: [],
  quiz: { questions: [{ question: "Frage?", options: ["a", "b", "c", "d"], answer: 0 }] },
};

const INVALID_DRAFT = { ...VALID_DRAFT, story: "" }; // fails validateStory's required-field check

const REVIEW_RESPONSE = {
  text: VALID_DRAFT.story,
  qualityScore: {
    grammar: 0.9, naturalness: 0.9, idiomaticity: 0.9, pragmatics: 0.9,
    register: 0.9, cefrConsistency: 0.9, translationInterference: 0.1, confidence: 0.9,
  },
};

const ANALYSIS_RESPONSE = {
  praesens: true, perfekt: false, modalverben: false,
  nebensaetze: false, relativsaetze: false, konjunktivII: false, passiv: false,
};

beforeEach(() => {
  createMock.mockReset();
});

describe("generateOneReadingWithDiagnostics — bounded retry", () => {
  it("retries once after a structural validation failure, then succeeds", async () => {
    createMock
      .mockResolvedValueOnce(message(INVALID_DRAFT)) // attempt 1: generate (invalid) — review/analyze never called for this attempt
      .mockResolvedValueOnce(message(VALID_DRAFT))   // attempt 2: generate (valid)
      .mockResolvedValueOnce(message(REVIEW_RESPONSE)) // attempt 2: review
      .mockResolvedValueOnce(message(ANALYSIS_RESPONSE)); // analyze (after the retry loop)

    const result = await generateOneReadingWithDiagnostics("story", "fake-key");

    expect(createMock).toHaveBeenCalledTimes(4);
    expect(result.story.story).toBe(VALID_DRAFT.story);
    expect(result.story.meta?.promptVersion).toBeTruthy();
  });

  it("gives up after MAX_GENERATION_ATTEMPTS and throws — never an unbounded loop", async () => {
    createMock
      .mockResolvedValueOnce(message(INVALID_DRAFT)) // attempt 1: fails
      .mockResolvedValueOnce(message(INVALID_DRAFT)); // attempt 2: fails too

    await expect(generateOneReadingWithDiagnostics("story", "fake-key")).rejects.toThrow();
    // Exactly 2 calls — proves it stopped at the bound instead of retrying
    // forever (review/analyze are never reached since validateStory throws
    // before them on both attempts).
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("succeeds on the first attempt with no retry when generation is valid", async () => {
    createMock
      .mockResolvedValueOnce(message(VALID_DRAFT))
      .mockResolvedValueOnce(message(REVIEW_RESPONSE))
      .mockResolvedValueOnce(message(ANALYSIS_RESPONSE));

    const result = await generateOneReadingWithDiagnostics("story", "fake-key");
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(result.story.story).toBe(VALID_DRAFT.story);
  });
});
