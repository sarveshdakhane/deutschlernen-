import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

function blobAuthHeaders(): HeadersInit | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_OIDC_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function GET(_: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const { blobs } = await list({ prefix: `readings-${date}` });
    if (blobs.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const res = await fetch(blobs[0].url, { headers: blobAuthHeaders() });
    if (!res.ok) {
      console.error(`[readings/${date}] blob fetch failed: ${res.status}`);
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
