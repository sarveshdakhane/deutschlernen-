import { get, put } from "@vercel/blob";

export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; slug: string }> }
) {
  const { date, slug } = await params;
  const keyword = new URL(request.url).searchParams.get("kw");

  if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !slug) {
    return new Response(null, { status: 400 });
  }

  const filename = `image-${date}-${decodeURIComponent(slug)}.jpg`;

  // Serve from blob if already cached
  try {
    const cached = await get(filename, { access: "private" });
    if (cached?.statusCode === 200 && cached.stream) {
      return new Response(cached.stream, {
        headers: {
          "Content-Type": cached.blob.contentType ?? "image/jpeg",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
  } catch {
    // not cached yet — fetch from Pixabay
  }

  if (!keyword || !process.env.PIXABAY_API_KEY) {
    return new Response(null, { status: 404 });
  }

  try {
    const apiUrl = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(keyword)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5&min_width=800`;
    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) return new Response(null, { status: 404 });

    const data = (await apiRes.json()) as { hits?: { webformatURL: string }[] };
    const imageUrl = data.hits?.[0]?.webformatURL;
    if (!imageUrl) return new Response(null, { status: 404 });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return new Response(null, { status: 404 });

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    await put(filename, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType,
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (err) {
    console.error(`[image] error for ${filename}:`, err);
    return new Response(null, { status: 500 });
  }
}
