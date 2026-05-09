import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deutsch lernen",
  description:
    "Daily German B1 reading, vocabulary, sentence patterns, and writing practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-100 bg-white mt-8 print:hidden">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
            Deutsch lernen — powered by Claude AI
          </div>
        </footer>
      </body>
    </html>
  );
}
