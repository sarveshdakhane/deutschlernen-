import { getCachedClips, saveCachedClips, PronunciationClip } from "@/lib/pronounceCache.server";

export const maxDuration = 30;

const TATOEBA_SEARCH = "https://tatoeba.org/en/api_v0/search";
const MAX_PAGES_TO_SCAN = 20;
const MAX_CLIPS = 5;

type TatoebaAudio = { download_url: string };
type TatoebaTranslation = { text: string; lang: string };
type TatoebaSentence = {
  id: number;
  text: string;
  audios?: TatoebaAudio[];
  translations?: TatoebaTranslation[][];
};
type TatoebaSearchResponse = {
  paging?: { Sentences?: { pageCount?: number } };
  results?: TatoebaSentence[];
};

function firstEnglishTranslation(sentence: TatoebaSentence): string | undefined {
  for (const group of sentence.translations ?? []) {
    const en = group.find((t) => t.lang === "eng");
    if (en) return en.text;
  }
  return undefined;
}

async function searchPage(word: string, page: number): Promise<TatoebaSearchResponse> {
  const url = `${TATOEBA_SEARCH}?from=deu&query=${encodeURIComponent(word)}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tatoeba search failed (${res.status})`);
  return (await res.json()) as TatoebaSearchResponse;
}

export async function GET(request: Request) {
  const word = new URL(request.url).searchParams.get("word")?.trim();
  if (!word) {
    return new Response(JSON.stringify({ error: "Missing 'word' query parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (clip: PronunciationClip) => controller.enqueue(encoder.encode(JSON.stringify(clip) + "\n"));

      try {
        const cached = await getCachedClips(word);
        if (cached) {
          cached.forEach(emit);
          controller.close();
          return;
        }

        const clips: PronunciationClip[] = [];

        function addSentence(sentence: TatoebaSentence) {
          if (clips.length >= MAX_CLIPS) return;
          if (clips.some((c) => c.sentenceId === sentence.id)) return;
          const audio = sentence.audios?.[0];
          if (!audio) return;

          const clip: PronunciationClip = {
            sentenceId: sentence.id,
            text: sentence.text,
            audioUrl: audio.download_url.startsWith("http")
              ? audio.download_url
              : `https://tatoeba.org${audio.download_url}`,
            translation: firstEnglishTranslation(sentence),
          };
          clips.push(clip);
          emit(clip);
        }

        const first = await searchPage(word, 1);
        (first.results ?? []).forEach(addSentence);
        const pageCount = Math.min(first.paging?.Sentences?.pageCount ?? 1, MAX_PAGES_TO_SCAN);

        // Tatoeba serializes requests per-IP regardless of client concurrency
        // (verified empirically), so fetching sequentially with an early exit
        // is just as fast as batching and avoids tripping their rate limiter.
        for (
          let page = 2;
          page <= pageCount && clips.length < MAX_CLIPS && !request.signal.aborted;
          page++
        ) {
          const data = await searchPage(word, page).catch(() => null);
          if (!data) break;
          (data.results ?? []).forEach(addSentence);
        }

        if (request.signal.aborted) return;

        await saveCachedClips(word, clips);
        controller.close();
      } catch (error) {
        console.error("[pronounce] fatal error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
