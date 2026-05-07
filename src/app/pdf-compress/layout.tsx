import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Compress PDF | Free, Ad-Free | Kami Studios",
  description:
    "Reduce PDF file size in your browser. Private, free, no upload. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/pdf-compress" },
  openGraph: {
    title: "Compress PDF | Free, Ad-Free | Kami Studios",
    description:
      "Reduce PDF file size in your browser. Private, free, no upload. No ads, no tracking.",
    url: "https://tools.iamkesava.com/pdf-compress",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/pdf-compress.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Compress PDF | Free, Ad-Free | Kami Studios",
    description:
      "Reduce PDF file size in your browser. Private, free, no upload. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/pdf-compress.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"pdf-compress","name":"PDF Compress","description":"Reduce PDF file size without uploading. 100% client-side.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
