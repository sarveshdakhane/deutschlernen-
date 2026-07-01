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

  // 1. Serve from blob cache if already downloaded
  try {
    const cached = await get(filename, { access: "private" });
    if (cached?.statusCode === 200 && cached.stream) {
      console.log(`[image] blob hit — ${filename}`);
      return new Response(cached.stream, {
        headers: {
          "Content-Type": cached.blob.contentType ?? "image/jpeg",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
  } catch {
    // not in blob yet — fall through to fetch
  }

  // 2. Call Pixabay API to get a fresh URL, download, and cache
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey || !keyword) {
    console.warn(`[image] no apiKey or keyword for ${filename}`);
    return new Response(null, { status: 404 });
  }

  try {
    const q = encodeURIComponent(keyword);
    const apiUrl = `https://pixabay.com/api/?key=${apiKey}&q=${q}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5&min_width=800`;
    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      console.warn(`[image] Pixabay API error: ${apiRes.status}`);
      return new Response(null, { status: 404 });
    }

    const data = (await apiRes.json()) as { hits?: { webformatURL: string }[] };
    const imageUrl = data.hits?.[0]?.webformatURL;
    if (!imageUrl) {
      console.warn(`[image] no hits for keyword: ${keyword}`);
      return new Response(null, { status: 404 });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.warn(`[image] image download failed: ${imgRes.status}`);
      return new Response(null, { status: 404 });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    // Save to blob so future requests skip the Pixabay API call
    await put(filename, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType,
    });
    console.log(`[image] fetched + cached ${filename}`);

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
