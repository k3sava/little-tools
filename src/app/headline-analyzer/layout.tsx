import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Headline Analyzer | Free, Ad-Free | Kami Studios",
  description:
    "Score headlines for emotional value, power words, readability, and click potential. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/headline-analyzer" },
  openGraph: {
    title: "Headline Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Score headlines for emotional value, power words, readability, and click potential. No ads, no tracking.",
    url: "https://tools.iamkesava.com/headline-analyzer",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Headline Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Score headlines for emotional value, power words, readability, and click potential. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
