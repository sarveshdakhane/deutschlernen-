import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "German Preposition Practice",
  description:
    "Daily German preposition (Präpositionen) fill-in-the-blank exercises with instant feedback for A2/B1 learners.",
  alternates: { canonical: "/praepositionen" },
};

export default function PraepositionenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
