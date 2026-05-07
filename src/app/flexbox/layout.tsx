import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
  description:
    "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/flexbox" },
  openGraph: {
    title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
    description:
      "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
    url: "https://tools.iamkesava.com/flexbox",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/flexbox.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
    description:
      "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/flexbox.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"flexbox","name":"Flexbox Playground","description":"Learn and experiment with CSS Flexbox interactively.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
