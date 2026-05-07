import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Hash Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text or files. Compare and verify hashes. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/hash-generator" },
  openGraph: {
    title: "Hash Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text or files. Compare and verify hashes. No ads, no tracking.",
    url: "https://tools.iamkesava.com/hash-generator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/hash-generator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Hash Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text or files. Compare and verify hashes. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/hash-generator.svg"]
  },
};

export default function HashGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"hash-generator","name":"Hash Generator","description":"Generate MD5, SHA-1, SHA-256, SHA-512 hashes.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
