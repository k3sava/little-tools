import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
  description:
    "Visualize and generate CSS border-radius values. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/border-radius" },
  openGraph: {
    title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
    description:
      "Visualize and generate CSS border-radius values. No ads, no tracking.",
    url: "https://tools.iamkesava.com/border-radius",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/border-radius.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
    description:
      "Visualize and generate CSS border-radius values. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/border-radius.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"border-radius","name":"Border Radius","description":"Visualize and generate CSS border-radius values.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
