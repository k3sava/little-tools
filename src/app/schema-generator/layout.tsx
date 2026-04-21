import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Schema Markup Generator (JSON-LD) | Free, Ad-Free | Kami Studios",
    description:
      "Build JSON-LD structured data for Articles, FAQs, Products, Local Business, and more. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
