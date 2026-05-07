import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/glassmorphism" },
  openGraph: {
    title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
    url: "https://tools.iamkesava.com/glassmorphism",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/glassmorphism.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/glassmorphism.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"glassmorphism","name":"Glassmorphism","description":"Generate glass and soft-UI effects with CSS output.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
