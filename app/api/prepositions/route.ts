import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requestGeneration } from "@/lib/generationCoordinatorClient.server";
import { PrepositionQuestion } from "@/lib/types";

export const maxDuration = 30;

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  const today = new Date().toISOString().split("T")[0];
  const { env, ctx } = getCloudflareContext();

  try {
    const questions = await requestGeneration<PrepositionQuestion[]>(env, today, "prepositions", force);

    // Fallback prefetch of tomorrow's set — see app/api/generate-story/route.ts
    // for why this is safe to fire unconditionally now that the coordinator
    // (not an in-memory flag) is the dedup authority.
    if (!force) {
      ctx.waitUntil(
        requestGeneration(env, getTomorrowDate(), "prepositions").catch((err) =>
          console.error("[prepositions prefetch] error:", err)
        )
      );
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
