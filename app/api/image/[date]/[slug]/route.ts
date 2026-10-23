import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBinary, putBinary } from "@/lib/storage.server";

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
  const { env } = getCloudflareContext();
  const bucket = env.CONTENT_BUCKET;

  // Serve from the content bucket if already cached
  const cached = await getBinary(bucket, filename);
  if (cached) {
    return new Response(cached.data, {
      headers: {
        "Content-Type": cached.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
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

    await putBinary(bucket, filename, buffer, contentType);

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
