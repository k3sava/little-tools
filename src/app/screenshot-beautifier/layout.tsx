import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
  description:
    "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/screenshot-beautifier",
  },
  openGraph: {
    title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
    description:
      "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
    url: "https://tools.iamkesava.com/screenshot-beautifier",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/screenshot-beautifier.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
    description:
      "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/screenshot-beautifier.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"screenshot-beautifier","name":"Screenshot Beautifier","description":"Add backgrounds, shadows, and frames to screenshots.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
