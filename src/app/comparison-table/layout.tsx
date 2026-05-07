import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
  description:
    "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/comparison-table" },
  openGraph: {
    title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
    url: "https://tools.iamkesava.com/comparison-table",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/comparison-table.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/comparison-table.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"comparison-table","name":"Comparison Table Builder","description":"Create feature comparison tables with export to HTML, PNG, and Markdown.","collection":"PMM","collectionHref":"/for/pmm"})} />
      {children}
    </>
  );
}
