import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/headline-analyzer.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Headline Analyzer | Free, Ad-Free | Kami Studios",
    description:
      "Score headlines for emotional value, power words, readability, and click potential. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/headline-analyzer.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"headline-analyzer","name":"Headline Analyzer","description":"Score headlines for emotional value, power words, readability, and click potential.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
