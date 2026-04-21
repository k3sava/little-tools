import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lorem Ipsum Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate lorem ipsum placeholder text by paragraphs, sentences, or words. Configurable count, classic or random start. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/lorem-ipsum" },
  openGraph: {
    title: "Lorem Ipsum Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate lorem ipsum placeholder text by paragraphs, sentences, or words. Configurable count, classic or random start. No ads, no tracking.",
    url: "https://tools.iamkesava.com/lorem-ipsum",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lorem Ipsum Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate lorem ipsum placeholder text by paragraphs, sentences, or words. Configurable count, classic or random start. No ads, no tracking.",
  },
};

export default function LoremIpsumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
