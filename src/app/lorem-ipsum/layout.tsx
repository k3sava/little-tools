import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/lorem-ipsum.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Lorem Ipsum Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate lorem ipsum placeholder text by paragraphs, sentences, or words. Configurable count, classic or random start. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/lorem-ipsum.svg"]
  },
};

export default function LoremIpsumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"lorem-ipsum","name":"Lorem Ipsum Generator","description":"Generate placeholder text by paragraphs, sentences, or words.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
