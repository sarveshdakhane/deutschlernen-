import { describe, expect, it } from "vitest";
import {
  DIALOGUE_STYLE_EXCERPT,
  SPEAKING_STYLE_EXCERPT,
  STORY_STYLE_EXCERPT,
  NEWS_STYLE_EXCERPT,
} from "../../lib/storyPrompt";
import { GOLDEN_EXAMPLES } from "./goldenExamples";

// Golden examples exist purely for testing (see goldenExamples.ts). This is
// a deterministic, enforced version of that rule: production prompt style
// anchors must never contain a golden example's text, so a future edit
// can't accidentally turn a test fixture into production content.
describe("golden examples never leak into production prompts", () => {
  const productionAnchors = [
    DIALOGUE_STYLE_EXCERPT,
    SPEAKING_STYLE_EXCERPT,
    STORY_STYLE_EXCERPT,
    NEWS_STYLE_EXCERPT,
  ];

  for (const [name, golden] of Object.entries(GOLDEN_EXAMPLES)) {
    it(`golden example "${name}" is not embedded in any production style anchor`, () => {
      const firstLine = golden.split("\n")[0];
      for (const anchor of productionAnchors) {
        expect(anchor).not.toContain(firstLine);
      }
    });
  }
});
