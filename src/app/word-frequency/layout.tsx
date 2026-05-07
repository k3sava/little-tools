import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Word Frequency Analyzer | Free, Ad-Free | Kami Studios",
  description:
    "Analyze word frequency with bar charts, filtering, and CSV export. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/word-frequency",
  },
  openGraph: {
    title: "Word Frequency Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze word frequency with bar charts, filtering, and CSV export. No ads, no tracking.",
    url: "https://tools.iamkesava.com/word-frequency",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/word-frequency.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Word Frequency Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze word frequency with bar charts, filtering, and CSV export. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/word-frequency.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"word-frequency","name":"Word Frequency","description":"Analyze word frequency with bar charts, filtering, and CSV export.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
