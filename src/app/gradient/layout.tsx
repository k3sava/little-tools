import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gradient Generator | Free, Ad-Free | Kami Studios",
  description:
    "Create CSS gradients with visual editor and code export. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/gradient" },
  openGraph: {
    title: "Gradient Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create CSS gradients with visual editor and code export. No ads, no tracking.",
    url: "https://tools.iamkesava.com/gradient",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Gradient Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create CSS gradients with visual editor and code export. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
