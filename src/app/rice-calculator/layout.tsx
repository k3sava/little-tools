import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
  description:
    "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/rice-calculator" },
  openGraph: {
    title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
    url: "https://tools.iamkesava.com/rice-calculator",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
