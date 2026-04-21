import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/palette" },
  openGraph: {
    title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
    url: "https://tools.iamkesava.com/palette",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Color Palette Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate harmonious color palettes with multiple harmony rules. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
