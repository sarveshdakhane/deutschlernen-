import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Deutsch — Daily German Reading & Listening Practice",
    short_name: "Daily Deutsch",
    description:
      "Free daily German reading practice for A2 and B1 learners: news stories, dialogues, vocabulary, preposition drills, and pronunciation audio.",
    start_url: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#111827",
    lang: "de",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
