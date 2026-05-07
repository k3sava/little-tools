import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/seo-content-analyzer.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Content Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Analyze content for keyword density, heading structure, readability, and SEO score. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/seo-content-analyzer.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"seo-content-analyzer","name":"SEO Content Analyzer","description":"Analyze content for keyword density, heading structure, readability, and SEO score.","collection":"SEO","collectionHref":"/for/seo"})} />
      {children}
    </>
  );
}
