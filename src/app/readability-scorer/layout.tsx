import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Readability Scorer | Free, Ad-Free | Kami Studios",
    description:
      "Grade content with Flesch-Kincaid, Gunning Fog, SMOG, ARI, and Coleman-Liau. Sentence highlighting and grade level summary. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
