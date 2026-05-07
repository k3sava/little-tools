import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Text Cleaner | Free, Ad-Free | Kami Studios",
  description:
    "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/text-cleaner" },
  openGraph: {
    title: "Text Cleaner | Free, Ad-Free | Kami Studios",
    description:
      "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
    url: "https://tools.iamkesava.com/text-cleaner",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/text-cleaner.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Cleaner | Free, Ad-Free | Kami Studios",
    description:
      "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/text-cleaner.svg"]
  },
};

export default function TextCleanerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"text-cleaner","name":"Text Cleaner","description":"Remove extra whitespace, line breaks, special characters, duplicate lines.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
