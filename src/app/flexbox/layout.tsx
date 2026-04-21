import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
  description:
    "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/flexbox" },
  openGraph: {
    title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
    description:
      "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
    url: "https://tools.iamkesava.com/flexbox",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Flexbox Playground | Free, Ad-Free | Kami Studios",
    description:
      "Learn and experiment with CSS Flexbox interactively. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
