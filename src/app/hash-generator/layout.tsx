import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Hash Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text or files. Compare and verify hashes. No ads, no tracking.",
  },
};

export default function HashGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
