import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-gray-900 font-semibold text-lg tracking-tight hover:text-gray-600 transition-colors">
          Deutsch lernen
        </Link>
        <nav className="flex gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Today
          </Link>
          <Link href="/stories" className="hover:text-gray-900 transition-colors">
            Archive
          </Link>
        </nav>
      </div>
    </header>
  );
}
