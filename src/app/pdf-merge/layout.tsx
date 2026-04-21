import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Merge PDF | Free, Ad-Free | Kami Studios",
    description:
      "Combine multiple PDF files into one. Client-side, private, free. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
