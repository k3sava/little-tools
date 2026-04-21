import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
  description:
    "Design CSS box shadows with visual controls. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/box-shadow" },
  openGraph: {
    title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
    description:
      "Design CSS box shadows with visual controls. No ads, no tracking.",
    url: "https://tools.iamkesava.com/box-shadow",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
    description:
      "Design CSS box shadows with visual controls. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
