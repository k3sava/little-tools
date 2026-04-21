import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Compress PDF | Free, Ad-Free | Kami Studios",
    description:
      "Reduce PDF file size in your browser. Private, free, no upload. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
