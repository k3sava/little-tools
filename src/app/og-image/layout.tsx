import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "OG Image Generator | Free, Ad-Free | Kami Studios",
  description:
    "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/og-image" },
  openGraph: {
    title: "OG Image Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
    url: "https://tools.iamkesava.com/og-image",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/og-image.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "OG Image Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
    images: ["https://tools.iamkesava.com/og/og-image.svg"]
  },
};

export default function OgImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"og-image","name":"OG Image Generator","description":"Create Open Graph images for social sharing.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
