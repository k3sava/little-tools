import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Text Diff Checker | Free, Ad-Free | Kami Studios",
    description:
      "Compare two texts side-by-side or inline with line-by-line diff. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
