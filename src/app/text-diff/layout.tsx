import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Text Diff Checker | Free, Ad-Free | Kami Studios",
  description:
    "Compare two texts side-by-side or inline with line-by-line diff. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/text-diff" },
  openGraph: {
    title: "Text Diff Checker | Free, Ad-Free | Kami Studios",
    description:
      "Compare two texts side-by-side or inline with line-by-line diff. No ads, no tracking.",
    url: "https://tools.iamkesava.com/text-diff",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/text-diff.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Diff Checker | Free, Ad-Free | Kami Studios",
    description:
      "Compare two texts side-by-side or inline with line-by-line diff. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/text-diff.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"text-diff","name":"Text Diff","description":"Compare two texts side-by-side or inline with line-by-line diff.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
