import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/positioning-builder" },
  openGraph: {
    title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
    url: "https://tools.iamkesava.com/positioning-builder",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Positioning Statement Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build positioning statements with guided frameworks from April Dunford, Geoffrey Moore, and more. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
