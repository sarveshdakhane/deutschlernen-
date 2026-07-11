import { NextResponse } from "next/server";
import { after } from "next/server";
import { put, get } from "@vercel/blob";
import { generateDailyPrepositions } from "@/lib/prepositions.server";
import { PrepositionQuestion } from "@/lib/types";

export const maxDuration = 30;

const prefetchedDates = new Set<string>();

const blobAvailable = () =>
  !!process.env.BLOB_READ_WRITE_TOKEN ||
  !!process.env.BLOB_STORE_ID ||
  !!process.env.VERCEL_OIDC_TOKEN;

async function readFromBlob(date: string): Promise<PrepositionQuestion[] | null> {
  if (!blobAvailable()) return null;
  try {
    const result = await get(`prepositions-${date}.json`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as PrepositionQuestion[];
  } catch {
    return null;
  }
}

async function saveToBlob(date: string, questions: PrepositionQuestion[]): Promise<void> {
  if (!blobAvailable()) return;
  try {
    await put(`prepositions-${date}.json`, JSON.stringify(questions), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error(`[blob] save failed for prepositions-${date}:`, err);
  }
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  const today = new Date().toISOString().split("T")[0];

  try {
    let questions: PrepositionQuestion[] | null = force ? null : await readFromBlob(today);

    if (!questions) {
      questions = await generateDailyPrepositions(today);
      await saveToBlob(today, questions);
    }

    // Generate and cache tomorrow's set in the background so it's ready before
    // the day rolls over, instead of making tomorrow's first visitor wait on it.
    if (!force && !prefetchedDates.has(today)) {
      prefetchedDates.add(today);
      after(async () => {
        const tomorrow = getTomorrowDate();
        try {
          const existing = await readFromBlob(tomorrow);
          if (!existing) {
            const tomorrowQuestions = await generateDailyPrepositions(tomorrow);
            await saveToBlob(tomorrow, tomorrowQuestions);
          }
        } catch (err) {
          console.error("[prepositions prefetch] error:", err);
        }
      });
    }

    return NextResponse.json(
      { date: today, questions },
      {
        headers: force
          ? { "Cache-Control": "no-store" }
          : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
      }
    );
  } catch (error) {
    console.error("[prepositions route] fatal error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate prepositions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
