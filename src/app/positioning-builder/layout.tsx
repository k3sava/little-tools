import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/positioning-builder" },
  openGraph: {
    title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
    url: "https://tools.iamkesava.com/positioning-builder",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/positioning-builder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/positioning-builder.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"positioning-builder","name":"Positioning Statement Builder","description":"Build positioning statements with guided frameworks from Dunford, Moore, and more.","collection":"PMM","collectionHref":"/for/pmm"})} />
      {children}
    </>
  );
}
