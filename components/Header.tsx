import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white print:hidden sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="text-gray-900 font-semibold text-base sm:text-lg tracking-tight hover:text-gray-600 transition-colors">
          Deutsch lernen
        </Link>
        <nav className="flex gap-1 sm:gap-2 text-sm text-gray-500">
          <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
            Today
          </Link>
          <Link href="/stories" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
            Weekly
          </Link>
          <Link href="/vocab" className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
            Vocab
          </Link>
        </nav>
      </div>
    </header>
  );
}
