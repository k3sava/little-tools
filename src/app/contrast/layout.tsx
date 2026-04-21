import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contrast Checker | Free, Ad-Free | Kami Studios",
  description:
    "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/contrast" },
  openGraph: {
    title: "Contrast Checker | Free, Ad-Free | Kami Studios",
    description:
      "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
    url: "https://tools.iamkesava.com/contrast",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contrast Checker | Free, Ad-Free | Kami Studios",
    description:
      "Check WCAG contrast ratios for accessibility compliance. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
