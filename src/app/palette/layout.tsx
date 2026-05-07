import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/palette" },
  openGraph: {
    title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
    url: "https://tools.iamkesava.com/palette",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/palette.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/palette.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"palette","name":"Color Palette","description":"Generate harmonious color palettes with multiple harmony rules.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
