"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900 print:hidden sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="text-slate-100 font-semibold text-base sm:text-lg tracking-tight hover:text-slate-300 transition-colors">
          Daily Deutsch
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/praepositionen" className="text-sm text-slate-400 hover:text-slate-100 transition-colors font-medium">
            Präpositionen
          </Link>
          <Link href="/archive" className="text-sm text-slate-400 hover:text-slate-100 transition-colors font-medium">
            Past Reads
          </Link>
        </div>
      </div>
    </header>
  );
}
