import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Content Brief Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, sections, and CTAs. Export as Markdown or copy to clipboard. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/content-brief-builder" },
  openGraph: {
    title: "Content Brief Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, sections, and CTAs. Export as Markdown or copy to clipboard.",
    url: "https://tools.iamkesava.com/content-brief-builder",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/content-brief-builder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Brief Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, sections, and CTAs. Export as Markdown or copy to clipboard.",
    images: ["https://tools.iamkesava.com/og/content-brief-builder.svg"]
  },
};

export default function ContentBriefBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"content-brief-builder","name":"Content Brief Builder","description":"Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, and outline.","collection":"SEO","collectionHref":"/for/seo"})} />
      {children}
    </>
  );
}
