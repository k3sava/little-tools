import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/grid" },
  openGraph: {
    title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
    url: "https://tools.iamkesava.com/grid",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CSS Grid Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS Grid layouts visually with template controls. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
