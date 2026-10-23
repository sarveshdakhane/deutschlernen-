import { ReadingType } from "./types";
import { FlatBlock, CategorizedVocabulary, groupByCategory, mergeCategorized } from "./notionVocabParser";

// Plain fetch against the Notion REST API — no @notionhq/client SDK, to keep
// this dependency-free and avoid any Workers-compat risk from an SDK we
// don't otherwise need. Uses the "data sources" query endpoint (the
// database-query endpoint it replaces was deprecated 2025-09-03).
const NOTION_VERSION = "2025-09-03";
const NOTION_API_BASE = "https://api.notion.com/v1";

export type NotionQueueEntry = {
  pageId: string;
  topic: string;
};

type NotionQueueProperties = {
  Topic?: { title?: { plain_text: string }[] };
};

type NotionPage = { id: string; properties: NotionQueueProperties };
type NotionQueryResponse = { results?: NotionPage[] };

function credentials(): { apiKey: string; dataSourceId: string } | null {
  const apiKey = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!apiKey || !dataSourceId) return null;
  return { apiKey, dataSourceId };
}

function vocabCredentials(): { apiKey: string; pageId: string } | null {
  const apiKey = process.env.NOTION_API_KEY;
  const pageId = process.env.NOTION_VOCAB_PAGE_ID;
  if (!apiKey || !pageId) return null;
  return { apiKey, pageId };
}

// Looks up the oldest "Ready" queue entry for this reading type (FIFO).
// Returns null — never throws — if Notion isn't configured, the request
// fails, or nothing is queued; callers fall back to the deterministic
// day-indexed topic rotation in lib/storyPrompt.ts exactly as if this
// feature didn't exist.
export async function queryQueuedEntry(type: ReadingType): Promise<NotionQueueEntry | null> {
  const creds = credentials();
  if (!creds) return null;

  try {
    const res = await fetch(`${NOTION_API_BASE}/data-sources/${creds.dataSourceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Status", select: { equals: "Ready" } },
            { property: "ReadingType", select: { equals: type } },
          ],
        },
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
        page_size: 1,
      }),
    });

    if (!res.ok) {
      console.error(`[notion] query failed for "${type}" (${res.status}):`, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as NotionQueryResponse;
    const page = data.results?.[0];
    if (!page) return null;

    const topic = page.properties.Topic?.title?.[0]?.plain_text?.trim();
    if (!topic) return null;

    return { pageId: page.id, topic };
  } catch (err) {
    console.error(`[notion] query error for "${type}":`, err);
    return null;
  }
}

// Flips a consumed queue entry's Status to "Used" — the idempotency marker
// that keeps it from being picked up again. Only call this after a
// generation actually succeeds; on failure, leave the row "Ready" so it's
// retried next cycle instead of silently lost.
export async function markEntryUsed(pageId: string): Promise<void> {
  const creds = credentials();
  if (!creds) return;

  try {
    const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: { Status: { select: { name: "Used" } } } }),
    });
    if (!res.ok) {
      console.error(`[notion] mark-used failed for ${pageId} (${res.status}):`, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error(`[notion] mark-used error for ${pageId}:`, err);
  }
}

// --- Vocabulary page (lib/vocabCooldown.server.ts is the caller) ---
//
// The "1. Vocabulary & Expressions" section of the user's personal Vocab
// page (a regular page, not a database) is laid out as a Notion column
// layout: one column_list block containing several column blocks, each with
// its own headings (Verben, Nomen, Adjektive & Adverbien, ...) and bulleted
// word/meaning entries. This walks that block tree via the Blocks API and
// hands the flattened text to the pure parser in lib/notionVocabParser.ts.

type NotionRichTextItem = { plain_text?: string };
type NotionApiBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};
type NotionBlocksResponse = { results: NotionApiBlock[]; has_more: boolean; next_cursor: string | null };

function blockPlainText(block: NotionApiBlock): string {
  const body = block[block.type] as { rich_text?: NotionRichTextItem[] } | undefined;
  return (body?.rich_text ?? []).map((t) => t.plain_text ?? "").join("");
}

async function fetchBlockChildren(blockId: string, apiKey: string): Promise<NotionApiBlock[]> {
  const all: NotionApiBlock[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "Notion-Version": NOTION_VERSION },
    });
    if (!res.ok) throw new Error(`blocks.children fetch failed for ${blockId} (${res.status})`);

    const data = (await res.json()) as NotionBlocksResponse;
    all.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}

// Fetches and parses the vocabulary section, grouped by category (Verben,
// Nomen, ...), oldest-to-newest within each category. Returns null — never
// throws — if Notion isn't configured, the page/section can't be found, or
// the request fails; callers treat this as "no vocabulary enrichment this
// run" rather than an error.
export async function fetchVocabularyCategories(): Promise<CategorizedVocabulary | null> {
  const creds = vocabCredentials();
  if (!creds) return null;

  try {
    const topLevel = await fetchBlockChildren(creds.pageId, creds.apiKey);

    const sectionStart = topLevel.findIndex(
      (b) => b.type === "heading_1" && blockPlainText(b).trim().startsWith("1.")
    );
    if (sectionStart === -1) {
      console.error("[notion] vocabulary section heading not found on the Vocab page");
      return null;
    }

    const sectionBlocks: NotionApiBlock[] = [];
    for (let i = sectionStart + 1; i < topLevel.length; i++) {
      const block = topLevel[i];
      if (block.type === "divider" || block.type === "heading_1") break;
      sectionBlocks.push(block);
    }

    const columnList = sectionBlocks.find((b) => b.type === "column_list" && b.has_children);
    if (!columnList) {
      console.error("[notion] no column layout found inside the vocabulary section");
      return null;
    }

    const columns = await fetchBlockChildren(columnList.id, creds.apiKey);
    const perColumn: CategorizedVocabulary[] = [];

    for (const column of columns) {
      if (column.type !== "column" || !column.has_children) continue;
      const columnBlocks = await fetchBlockChildren(column.id, creds.apiKey);

      const flat: FlatBlock[] = columnBlocks
        .filter((b) => b.type === "heading_2" || b.type === "heading_3" || b.type === "bulleted_list_item")
        .map((b) => ({
          kind: b.type === "bulleted_list_item" ? "bullet" : "heading",
          text: blockPlainText(b),
        }));

      perColumn.push(groupByCategory(flat));
    }

    return mergeCategorized(perColumn);
  } catch (err) {
    console.error("[notion] vocabulary fetch error:", err);
    return null;
  }
}
