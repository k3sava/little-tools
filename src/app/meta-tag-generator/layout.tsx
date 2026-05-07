import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Meta Tag Generator & SERP Previewer | Free, Ad-Free | Kami Studios",
  description:
    "Generate meta titles, descriptions, OG tags, and Twitter cards with live Google SERP previews. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/meta-tag-generator" },
  openGraph: {
    title: "Meta Tag Generator & SERP Previewer | Free, Ad-Free | Kami Studios",
    description:
      "Generate meta titles, descriptions, OG tags, and Twitter cards with live Google SERP previews. No ads, no tracking.",
    url: "https://tools.iamkesava.com/meta-tag-generator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/meta-tag-generator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Meta Tag Generator & SERP Previewer | Free, Ad-Free | Kami Studios",
    description:
      "Generate meta titles, descriptions, OG tags, and Twitter cards with live Google SERP previews. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/meta-tag-generator.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"meta-tag-generator","name":"Meta Tag Generator","description":"Generate meta titles, descriptions, OG tags, and Twitter cards with live SERP previews.","collection":"SEO","collectionHref":"/for/seo"})} />
      {children}
    </>
  );
}
