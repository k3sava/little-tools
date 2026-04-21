import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Meta Tag Generator & SERP Previewer | Free, Ad-Free | Kami Studios",
    description:
      "Generate meta titles, descriptions, OG tags, and Twitter cards with live Google SERP previews. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
