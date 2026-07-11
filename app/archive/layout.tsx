import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Past Reads",
  description:
    "Browse previous daily German reading editions — news, dialogues, and stories for A2/B1 learners.",
  alternates: { canonical: "/archive" },
};

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
