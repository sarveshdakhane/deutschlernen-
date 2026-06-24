import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

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
    // downloadUrl is a pre-signed URL valid for private blobs
    const fetchUrl = blobs[0].downloadUrl ?? blobs[0].url;
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[readings/${date}] error:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
