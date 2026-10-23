import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listKeys } from "@/lib/storage.server";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const objects = await listKeys(env.CONTENT_BUCKET, "readings-");
    const today = new Date().toISOString().split("T")[0];

    const archive = objects
      .map((o) => ({
        date: o.key.replace("readings-", "").replace(".json", ""),
      }))
      .filter((item) => item.date < today && item.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json(archive);
  } catch {
    return NextResponse.json([]);
  }
}
