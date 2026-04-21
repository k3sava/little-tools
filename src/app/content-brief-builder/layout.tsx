import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Content Brief Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, sections, and CTAs. Export as Markdown or copy to clipboard.",
  },
};

export default function ContentBriefBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
