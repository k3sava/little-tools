import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Schema Markup Generator (JSON-LD) | Free, Ad-Free | Kami Studios",
  description:
    "Build JSON-LD structured data for Articles, FAQs, Products, Local Business, and more. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/schema-generator",
  },
  openGraph: {
    title: "Schema Markup Generator (JSON-LD) | Free, Ad-Free | Kami Studios",
    description:
      "Build JSON-LD structured data for Articles, FAQs, Products, Local Business, and more. No ads, no tracking.",
    url: "https://tools.iamkesava.com/schema-generator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/schema-generator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Schema Markup Generator (JSON-LD) | Free, Ad-Free | Kami Studios",
    description:
      "Build JSON-LD structured data for Articles, FAQs, Products, Local Business, and more. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/schema-generator.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"schema-generator","name":"Schema Generator","description":"Build JSON-LD structured data for Articles, FAQs, Products, and more.","collection":"SEO","collectionHref":"/for/seo"})} />
      {children}
    </>
  );
}
