import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "PDF Split | Free, Ad-Free | Kami Studios",
  description:
    "Extract specific pages from a PDF. 100% client-side. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/pdf-split" },
  openGraph: {
    title: "PDF Split | Free, Ad-Free | Kami Studios",
    description:
      "Extract specific pages from a PDF. 100% client-side. No ads, no tracking.",
    url: "https://tools.iamkesava.com/pdf-split",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/pdf-split.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Split | Free, Ad-Free | Kami Studios",
    description:
      "Extract specific pages from a PDF. 100% client-side. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/pdf-split.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"pdf-split","name":"PDF Split","description":"Extract specific pages from a PDF. 100% client-side.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
