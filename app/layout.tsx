import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = "https://www.dailydeutsch.org";
const SITE_NAME = "Daily Deutsch";
const SITE_DESCRIPTION =
  "Free daily German reading practice for A2 and B1 learners: news stories, dialogues, vocabulary, preposition drills, and word-by-word pronunciation audio.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Daily Deutsch — Daily German Reading & Listening Practice",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "learn German",
    "German reading practice",
    "daily German news",
    "German B1 reading",
    "German A2 reading",
    "German vocabulary",
    "German prepositions practice",
    "Deutsch lernen",
    "German pronunciation",
    "German listening practice",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Daily Deutsch — Daily German Reading & Listening Practice",
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Deutsch — Daily German Reading & Listening Practice",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥨</text></svg>",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: ["de", "en"],
    },
    {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
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
