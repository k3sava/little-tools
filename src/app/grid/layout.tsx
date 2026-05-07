import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/grid" },
  openGraph: {
    title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
    url: "https://tools.iamkesava.com/grid",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/grid.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/grid.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"grid","name":"CSS Grid","description":"Build CSS Grid layouts visually with template controls.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
