import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "PDF Split | Free, Ad-Free | Kami Studios",
    description:
      "Extract specific pages from a PDF. 100% client-side. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
