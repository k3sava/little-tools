import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Scroll Animation | Free, Ad-Free | Kami Studios",
  description:
    "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/scroll-animation",
  },
  openGraph: {
    title: "Scroll Animation | Free, Ad-Free | Kami Studios",
    description:
      "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
    url: "https://tools.iamkesava.com/scroll-animation",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/scroll-animation.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Scroll Animation | Free, Ad-Free | Kami Studios",
    description:
      "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/scroll-animation.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"scroll-animation","name":"Scroll Animation","description":"Generate scroll-driven CSS animations with live preview.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
