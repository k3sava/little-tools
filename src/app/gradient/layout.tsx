import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Gradient Generator | Free, Ad-Free | Kami Studios",
  description:
    "Create CSS gradients with visual editor and code export. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/gradient" },
  openGraph: {
    title: "Gradient Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create CSS gradients with visual editor and code export. No ads, no tracking.",
    url: "https://tools.iamkesava.com/gradient",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/gradient.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Gradient Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create CSS gradients with visual editor and code export. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/gradient.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"gradient","name":"Gradient Generator","description":"Create CSS gradients with visual editor and code export.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
