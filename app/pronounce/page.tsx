import PronounceSearch from "@/components/PronounceSearch";

export default function PronouncePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pronounce</h1>
        <p className="text-sm text-gray-400 mt-1">Hear any German word spoken in real sentences</p>
      </div>

      <PronounceSearch />
    </main>
  );
}
