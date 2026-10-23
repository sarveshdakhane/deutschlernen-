import { DurableObject } from "cloudflare:workers";
import { generateDailyReadingsCore } from "../lib/claude";
import { generateDailyPrepositionsCore } from "../lib/prepositions.server";
import { assignProxyImageUrls } from "../lib/readingsAssembly.server";
import { getJson, putJson } from "../lib/storage.server";
import type { Story } from "../lib/types";

type Kind = "readings" | "prepositions";

// Serializes concurrent "generate content for this date" requests so they
// never race. The previous approach deduped with a module-level Map/Set,
// which only works within a single Worker isolate — Cloudflare (like any
// serverless/edge platform) can and does run many isolates for the same
// Worker concurrently, so that Map never actually prevented two isolates
// from both calling the Claude pipeline for the same date (this was the
// root cause behind this app's repeated "blob injection fix" bugs).
//
// A Durable Object instance is globally unique per id. idFromName(`${date}:${kind}`)
// guarantees every request for that date+kind, from any isolate anywhere,
// resolves to this exact instance and queues behind `this.inflight` instead
// of each independently calling the generator.
export class GenerationCoordinatorDO extends DurableObject<CloudflareEnv> {
  private inflight: Promise<unknown> | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const kind = url.searchParams.get("kind") as Kind | null;
    const force = url.searchParams.get("force") === "true";

    if (!date || (kind !== "readings" && kind !== "prepositions")) {
      return Response.json({ error: "invalid request: date and kind are required" }, { status: 400 });
    }

    if (!this.inflight) {
      this.inflight = this.run(date, kind, force).finally(() => {
        this.inflight = null;
      });
    }

    try {
      const result = await this.inflight;
      return Response.json(result);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "generation failed" },
        { status: 500 }
      );
    }
  }

  private async run(date: string, kind: Kind, force: boolean): Promise<unknown> {
    const bucket = this.env.CONTENT_BUCKET;
    const key = kind === "readings" ? `readings-${date}.json` : `prepositions-${date}.json`;

    if (!force) {
      const cached = await getJson(bucket, key);
      if (cached) return cached;
    }

    const result =
      kind === "readings"
        ? await this.generateReadings(date, bucket)
        : await generateDailyPrepositionsCore();

    await putJson(bucket, key, result);
    return result;
  }

  // Generates one day's readings and assigns the proxy image URLs the
  // frontend expects.
  private async generateReadings(date: string, bucket: R2Bucket): Promise<Story[]> {
    const readings = await generateDailyReadingsCore(date, bucket);
    return assignProxyImageUrls(readings, date);
  }
}
