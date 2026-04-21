import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Character Counter | Free, Ad-Free | Kami Studios",
  description:
    "Count characters, words, sentences, paragraphs, and estimate reading & speaking time. Includes Flesch-Kincaid readability score. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/character-counter" },
  openGraph: {
    title: "Character Counter | Free, Ad-Free | Kami Studios",
    description:
      "Count characters, words, sentences, paragraphs, and estimate reading & speaking time. Includes Flesch-Kincaid readability score. No ads, no tracking.",
    url: "https://tools.iamkesava.com/character-counter",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Character Counter | Free, Ad-Free | Kami Studios",
    description:
      "Count characters, words, sentences, paragraphs, and estimate reading & speaking time. Includes Flesch-Kincaid readability score. No ads, no tracking.",
  },
};

export default function CharacterCounterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
