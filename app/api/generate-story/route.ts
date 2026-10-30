import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requestGeneration } from "@/lib/generationCoordinatorClient.server";
import { isAdminRequest } from "@/lib/adminAuth.server";
import { Story } from "@/lib/types";

// See app/api/readings/[date]/route.ts — same reasoning, kept in sync since
// this route currently duplicates it.
export const maxDuration = 120;

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "true";
  // Forced regeneration bypasses the R2 cache and re-runs the whole Claude
  // pipeline, so it's admin-only — otherwise anyone could burn API tokens.
  if (force && !(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = new Date().toISOString().split("T")[0];
  const { env, ctx } = getCloudflareContext();

  try {
    const readings = await requestGeneration<Story[]>(env, today, "readings", force);

    // Opportunistic fallback prefetch of tomorrow's content. The cron trigger
    // in workers/entry.ts is the primary mechanism for this now; this just
    // covers the gap before that's had a chance to run (e.g. right after a
    // fresh deploy). Safe to fire on every request with no in-memory
    // "already triggered" flag — the coordinator itself is the dedup
    // authority (one Durable Object instance per date+kind, globally), so a
    // tomorrow that's already cached or already in flight just resolves
    // immediately or joins the same in-flight call.
    if (!force) {
      ctx.waitUntil(
        requestGeneration(env, getTomorrowDate(), "readings").catch((err) =>
          console.error("[prefetch] error:", err)
        )
      );
    }

    return NextResponse.json(readings, {
      headers: force
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[route] fatal error:", error);
    // Generic message only — internal errors can include upstream API details.
    return NextResponse.json({ error: "Failed to generate readings" }, { status: 500 });
  }
}
