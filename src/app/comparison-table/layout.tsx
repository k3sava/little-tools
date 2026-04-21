import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
  description:
    "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/comparison-table" },
  openGraph: {
    title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
    url: "https://tools.iamkesava.com/comparison-table",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Comparison Table Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create feature comparison tables with export to HTML, PNG, and Markdown. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
