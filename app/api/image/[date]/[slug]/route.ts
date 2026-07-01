import { get } from "@vercel/blob";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  try {
    const result = await get(`image-${date}-${slug}.jpg`, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new Response(null, { status: 404 });
    }
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable", // cache 7 days in browser
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
