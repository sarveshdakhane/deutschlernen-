"use client";

import Link from "next/link";

export default function Header() {
  const handleHome = () => {
    window.dispatchEvent(new CustomEvent("todays-read-home"));
  };

  return (
    <header className="border-b border-gray-100 bg-white print:hidden sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" onClick={handleHome} className="text-gray-900 font-semibold text-base sm:text-lg tracking-tight hover:text-gray-600 transition-colors">
          Daily Deutsch
        </Link>
        <Link href="/archive" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
          Past Reads
        </Link>
      </div>
    </header>
  );
}
