import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Contrast Checker | Free, Ad-Free | Kami Studios",
  description:
    "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/contrast" },
  openGraph: {
    title: "Contrast Checker | Free, Ad-Free | Kami Studios",
    description:
      "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
    url: "https://tools.iamkesava.com/contrast",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/contrast.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Contrast Checker | Free, Ad-Free | Kami Studios",
    description:
      "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/contrast.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"contrast","name":"Contrast Checker","description":"Check WCAG contrast ratios for accessibility compliance.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
