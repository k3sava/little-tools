import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/character-counter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Character Counter | Free, Ad-Free | Kami Studios",
    description:
      "Count characters, words, sentences, paragraphs, and estimate reading & speaking time. Includes Flesch-Kincaid readability score. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/character-counter.svg"]
  },
};

export default function CharacterCounterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"character-counter","name":"Character Counter","description":"Count characters, words, sentences, paragraphs, and estimate reading time.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
