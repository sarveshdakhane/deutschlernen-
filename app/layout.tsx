import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://www.dailydeutsch.org"),
  title: "Daily Deutsch",
  description: "Daily German reading and vocabulary practice for B1 learners.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥨</text></svg>",
  },
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
          <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
            Daily Deutsch
          </div>
        </footer>
      </body>
    </html>
  );
}
