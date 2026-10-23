import { Story } from "./types";

// Stores imageKeyword in the proxy URL so the image route can fetch from
// Pixabay on first request and cache in R2 — no expiring CDN URLs stored.
export function assignProxyImageUrls(readings: Story[], date: string): Story[] {
  return readings.map((story) => {
    if (!story.imageKeyword) return story;
    const proxyUrl = `/api/image/${date}/${encodeURIComponent(story.slug)}?kw=${encodeURIComponent(story.imageKeyword)}`;
    return { ...story, imageUrl: proxyUrl };
  });
}
