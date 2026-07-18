import { describe, expect, it } from "vitest";
import {
  buildNewsPrompt,
  buildDialoguePrompt,
  buildStoryPrompt,
  buildSpeakingPrompt,
  buildPromptForType,
  GenerationPrompt,
} from "../../lib/storyPrompt";
import { ReadingType } from "../../lib/types";

// These tests are fully deterministic and make no network calls — they run
// as part of `npm test` and CI. They exist to catch prompt regressions that
// don't require spending an OpenAI call to detect: a shared rule block
// silently dropped from a prompt, the grammarChecklist self-report
// contradiction creeping back in, or a builder losing its topicOverride hook
// that the live regression suite (tests/prompts/liveGeneration.test.ts)
// depends on.

const BUILDERS: { name: ReadingType; build: (override?: string) => GenerationPrompt }[] = [
  { name: "news", build: buildNewsPrompt },
  { name: "dialogue", build: buildDialoguePrompt },
  { name: "story", build: buildStoryPrompt },
  { name: "speaking", build: buildSpeakingPrompt },
];

for (const { name, build } of BUILDERS) {
  describe(`build${name[0].toUpperCase()}${name.slice(1)}Prompt`, () => {
    const prompt = build();

    it("returns non-empty system and user prompts", () => {
      expect(prompt.system.trim().length).toBeGreaterThan(0);
      expect(prompt.user.trim().length).toBeGreaterThan(0);
    });

    it("establishes the native-linguist persona in the system prompt", () => {
      expect(prompt.system).toContain("native German linguist");
    });

    it("includes the shared naturalness and collocation rule blocks", () => {
      expect(prompt.user).toContain("NATURALNESS RULES");
      expect(prompt.user).toContain("COLLOCATION RULE");
      expect(prompt.user).toContain("FINAL SELF-CHECK");
    });

    it("never asks the generator to self-report grammarChecklist", () => {
      // Regression guard for the fixed Konjunktiv II contradiction: the
      // generator must never be asked about this metadata again — only the
      // dedicated analysis pass (lib/prompts/analysisPrompt.ts) determines it.
      expect(prompt.user).not.toContain("grammarChecklist");
      expect(prompt.user).not.toContain("konjunktivII");
    });

    it("includes the expected JSON schema fields", () => {
      expect(prompt.user).toContain('"title"');
      expect(prompt.user).toContain('"vocabulary"');
      expect(prompt.user).toContain('"quiz"');
      expect(prompt.user).toContain(`"readingType": "${name}"`);
    });

    it("honors a topicOverride instead of the daily rotation", () => {
      const marker = "TEST_SCENARIO_MARKER_" + name;
      const overridden = build(marker);
      expect(overridden.user).toContain(marker);
    });
  });
}

describe("buildPromptForType", () => {
  it("forwards topicOverride to the correct builder for every reading type", () => {
    const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
    for (const type of types) {
      const marker = `TEST_MARKER_${type}`;
      const prompt = buildPromptForType(type, marker);
      expect(prompt.user).toContain(marker);
    }
  });
});
