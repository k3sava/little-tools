import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO Content Analyzer | Free, Ad-Free | Kami Studios",
  description:
    "Analyze content for keyword density, heading structure, readability, and SEO score. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/seo-content-analyzer",
  },
  openGraph: {
    title: "SEO Content Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze content for keyword density, heading structure, readability, and SEO score. No ads, no tracking.",
    url: "https://tools.iamkesava.com/seo-content-analyzer",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SEO Content Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze content for keyword density, heading structure, readability, and SEO score. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
