// Pure parsing logic for the Vocab page's "1. Vocabulary & Expressions"
// section — no network I/O (that lives in lib/notion.server.ts), so this is
// unit-testable with hand-built fixtures instead of live Notion data.

// Extracts the headword from a "word — meaning" style line (the format used
// throughout that section, e.g. "abreisen — to depart" or "Regierung - Government").
// Returns null for lines that don't match (example sentences, asides like
// "*More verbs... see 6. Differences*") so callers can skip them — those
// lines don't have a reliable word/meaning split point.
export function extractHeadword(fullText: string): string | null {
  const text = fullText.trim();
  if (!text) return null;

  // em dash, en dash, or a plain hyphen, but only when space-bounded —
  // German compounds can contain a bare hyphen with no surrounding spaces
  // (e.g. "E-Mail"), which must not be mistaken for the word/meaning split.
  const sepMatch = text.match(/\s[—–-]\s/);
  if (!sepMatch || sepMatch.index === undefined) return null;

  let head = text.slice(0, sepMatch.index).trim();
  if (!head) return null;

  // "abreisen / ist abgereist" or "anwesend ↔ abwesend" → keep just the
  // first/primary form as the single target word.
  head = head.split(/\s+[/↔]\s+/)[0].trim();

  return head.length > 0 ? head : null;
}

export type FlatBlock = { kind: "heading" | "bullet"; text: string };

// Groups a flat, in-document-order list of heading/bullet text (already
// restricted to one column's direct children — nested sub-bullets like
// example sentences must be excluded by the caller before this runs) into
// category -> ordered word list (oldest/first-added to newest/last-added).
export function groupByCategory(blocks: FlatBlock[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let currentCategory = "General";

  for (const block of blocks) {
    if (block.kind === "heading") {
      const heading = block.text.trim();
      if (heading) currentCategory = heading;
      result[currentCategory] ??= [];
      continue;
    }

    const word = extractHeadword(block.text);
    if (!word) continue;
    result[currentCategory] ??= [];
    result[currentCategory].push(word);
  }

  return result;
}

export type CategorizedVocabulary = Record<string, string[]>;

// Merges category->words maps from multiple columns (the section is laid
// out as several Notion columns, each with its own headings/bullets).
// Same-named categories across columns are concatenated, oldest-first order
// preserved within each source column.
export function mergeCategorized(
  maps: CategorizedVocabulary[]
): CategorizedVocabulary {
  const merged: CategorizedVocabulary = {};
  for (const map of maps) {
    for (const [category, words] of Object.entries(map)) {
      merged[category] = [...(merged[category] ?? []), ...words];
    }
  }
  return merged;
}
