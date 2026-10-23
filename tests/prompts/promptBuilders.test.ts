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
import { TopicItem } from "../../lib/topicPools";

// These tests are fully deterministic and make no network calls — they run
// as part of `npm test` and CI. They exist to catch prompt regressions that
// don't require spending an OpenAI call to detect: a shared rule block
// silently dropped from a prompt, the grammarChecklist self-report
// contradiction creeping back in, or a builder losing its topicOverride hook
// that the live regression suite (tests/prompts/liveGeneration.test.ts)
// depends on.

const BUILDERS: {
  name: ReadingType;
  build: (override?: string, targetVocabulary?: string[]) => GenerationPrompt;
}[] = [
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

    it("omits the required-vocabulary block when no targetVocabulary is given", () => {
      expect(prompt.user).not.toContain("REQUIRED VOCABULARY");
    });

    it("injects the required-vocabulary block when targetVocabulary is given", () => {
      const withVocab = build(undefined, ["die Verspätung", "sich entschuldigen"]);
      expect(withVocab.user).toContain("REQUIRED VOCABULARY");
      expect(withVocab.user).toContain("die Verspätung");
      expect(withVocab.user).toContain("sich entschuldigen");
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

  it("forwards targetVocabulary to the correct builder for every reading type", () => {
    const types: ReadingType[] = ["news", "dialogue", "story", "speaking"];
    for (const type of types) {
      const marker = `TEST_VOCAB_MARKER_${type}`;
      const prompt = buildPromptForType(type, undefined, [marker]);
      expect(prompt.user).toContain("REQUIRED VOCABULARY");
      expect(prompt.user).toContain(marker);
    }
  });
});

// --- Task section 7.7: news prompts must not instruct the model to invent
// plausible current events / fabricated attributed quotes. ---
describe("buildNewsPrompt — authenticity (section 3)", () => {
  it("never instructs the model to invent a plausible current event", () => {
    const prompt = buildNewsPrompt();
    expect(prompt.user.toLowerCase()).not.toContain("could plausibly be a top news story");
  });

  it("never asks for a fabricated attributed quote", () => {
    const prompt = buildNewsPrompt();
    expect(prompt.user).not.toContain("Include at least one direct quote with attribution");
  });

  it("explicitly forbids inventing direct quotations from named officials", () => {
    const prompt = buildNewsPrompt();
    expect(prompt.user).toContain("Do NOT invent direct quotations");
  });

  it("frames the piece as an explainer, not a breaking-news report", () => {
    const prompt = buildNewsPrompt();
    expect(prompt.user.toLowerCase()).toContain("explainer");
  });

  it("applies the same no-fabrication caution even when a manual topicOverride is given", () => {
    const prompt = buildNewsPrompt("a real current event the user pasted in");
    expect(prompt.user).toContain("Do NOT invent a specific");
  });
});

// --- Task section 7.6: factual and fictional content are distinguished. ---
describe("factuality framing (sections 1.2, 1.4, 3)", () => {
  const fictionItem: TopicItem = { id: "t-fiction", category: "test", premise: "A fictional test premise.", factuality: "fiction" };
  const historyItem: TopicItem = {
    id: "t-history",
    category: "test",
    premise: "A historical test premise.",
    factuality: "history",
    verifiedBackground: ["Fact one.", "Fact two."],
  };
  const verifiedFactItem: TopicItem = { id: "t-vf", category: "test", premise: "A general-knowledge test premise.", factuality: "verified_fact" };

  it("labels a fiction topicItem as fictional, never as a true event", () => {
    const prompt = buildStoryPrompt(undefined, undefined, fictionItem);
    expect(prompt.user).toContain("FICTIONAL scenario");
    expect(prompt.user).not.toContain("VERIFIED FACTS");
  });

  it("labels a history topicItem as real and injects its verified background facts verbatim", () => {
    const prompt = buildStoryPrompt(undefined, undefined, historyItem);
    expect(prompt.user).toContain("REAL HISTORICAL EVENT");
    expect(prompt.user).toContain("Fact one.");
    expect(prompt.user).toContain("Fact two.");
    expect(prompt.user).not.toContain("FICTIONAL scenario");
  });

  it("labels a verified_fact topicItem as a real explainer subject", () => {
    const prompt = buildStoryPrompt(undefined, undefined, verifiedFactItem);
    expect(prompt.user).toContain("REAL, general-knowledge subject");
  });

  it("an explicit topicOverride string takes priority over a supplied topicItem (override wins)", () => {
    const prompt = buildStoryPrompt("OVERRIDE_MARKER", undefined, historyItem);
    expect(prompt.user).toContain("OVERRIDE_MARKER");
    expect(prompt.user).not.toContain("Fact one.");
  });

  it("news applies the same history/verified_fact framing", () => {
    const prompt = buildNewsPrompt(undefined, undefined, historyItem);
    expect(prompt.user).toContain("REAL HISTORICAL EVENT");
    expect(prompt.user).toContain("Fact one.");
  });
});

// --- Task section 7.9: JSON schema stays compatible — specifically, the
// example difficulty literal must match each type's real difficulty, so the
// model never copies the wrong one into its own output. ---
describe("JSON template difficulty per reading type (section 9.5 follow-up)", () => {
  it("shows difficulty A2 for speaking", () => {
    const prompt = buildSpeakingPrompt();
    expect(prompt.user).toContain('"difficulty": "A2"');
    expect(prompt.user).not.toContain('"difficulty": "B1"');
  });

  it("shows difficulty B1 for news, dialogue, and story", () => {
    for (const build of [buildNewsPrompt, buildDialoguePrompt, buildStoryPrompt]) {
      const prompt = build();
      expect(prompt.user).toContain('"difficulty": "B1"');
    }
  });
});

// --- Task section 4/5: dialogue and speaking topicItem metadata actually
// reaches the prompt. ---
describe("topicItem purpose/conflict/tone metadata reaches dialogue & speaking prompts", () => {
  const dialogueItem: TopicItem = {
    id: "t-dlg", category: "test", premise: "A test dialogue premise.",
    purpose: "disagreeing and finding a compromise", centralConflict: "a test conflict", emotionalTone: "a test tone",
  };
  const speakingItem: TopicItem = {
    id: "t-spk", category: "test", premise: "A test speaking premise.",
    purpose: "apologizing and explaining why",
  };

  it("includes the communicative purpose for dialogue", () => {
    const prompt = buildDialoguePrompt(undefined, undefined, dialogueItem);
    expect(prompt.user).toContain("disagreeing and finding a compromise");
  });

  it("includes the communicative purpose for speaking", () => {
    const prompt = buildSpeakingPrompt(undefined, undefined, speakingItem);
    expect(prompt.user).toContain("apologizing and explaining why");
  });
});
