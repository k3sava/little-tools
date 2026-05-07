import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Merge PDF | Free, Ad-Free | Kami Studios",
  description:
    "Combine multiple PDF files into one. Client-side, private, free. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/pdf-merge" },
  openGraph: {
    title: "Merge PDF | Free, Ad-Free | Kami Studios",
    description:
      "Combine multiple PDF files into one. Client-side, private, free. No ads, no tracking.",
    url: "https://tools.iamkesava.com/pdf-merge",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/pdf-merge.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Merge PDF | Free, Ad-Free | Kami Studios",
    description:
      "Combine multiple PDF files into one. Client-side, private, free. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/pdf-merge.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"pdf-merge","name":"PDF Merge","description":"Combine multiple PDF files into one. Files never leave your browser.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
