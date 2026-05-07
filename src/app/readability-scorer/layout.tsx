import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Readability Scorer | Free, Ad-Free | Kami Studios",
  description:
    "Grade content with Flesch-Kincaid, Gunning Fog, SMOG, ARI, and Coleman-Liau. Sentence highlighting and grade level summary. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/readability-scorer" },
  openGraph: {
    title: "Readability Scorer | Free, Ad-Free | Kami Studios",
    description:
      "Grade content with Flesch-Kincaid, Gunning Fog, SMOG, ARI, and Coleman-Liau. Sentence highlighting and grade level summary. No ads, no tracking.",
    url: "https://tools.iamkesava.com/readability-scorer",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/readability-scorer.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Readability Scorer | Free, Ad-Free | Kami Studios",
    description:
      "Grade content with Flesch-Kincaid, Gunning Fog, SMOG, ARI, and Coleman-Liau. Sentence highlighting and grade level summary. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/readability-scorer.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"readability-scorer","name":"Readability Scorer","description":"Grade content with Flesch-Kincaid, Gunning Fog, SMOG, and more.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
