import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  const hasCreds = !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID || !!process.env.VERCEL_OIDC_TOKEN;
  if (!hasCreds) return NextResponse.json([]);
  try {
    const { blobs } = await list({ prefix: "readings-" });
    const today = new Date().toISOString().split("T")[0];

    const archive = blobs
      .map((b) => ({
        date: b.pathname.replace("readings-", "").replace(".json", ""),
        url: b.url,
      }))
      .filter((item) => item.date < today && item.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first

    return NextResponse.json(archive);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
