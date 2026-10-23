import type { Metadata } from "next";
import PronounceSearch from "@/components/PronounceSearch";

export const metadata: Metadata = {
  title: "Pronounce German Words",
  description:
    "Hear any German word spoken aloud in real example sentences. Free German pronunciation lookup for learners.",
  alternates: { canonical: "/pronounce" },
};

export default function PronouncePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Pronounce</h1>
        <p className="text-sm text-slate-500 mt-1">Hear any German word spoken in real sentences</p>
      </div>

      <PronounceSearch />
    </main>
  );
}
