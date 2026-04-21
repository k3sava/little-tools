import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Word Frequency Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze word frequency with bar charts, filtering, and CSV export. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
