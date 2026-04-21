import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
  description:
    "Visualize and generate CSS border-radius values. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/border-radius" },
  openGraph: {
    title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
    description:
      "Visualize and generate CSS border-radius values. No ads, no tracking.",
    url: "https://tools.iamkesava.com/border-radius",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Border Radius Generator | Free, Ad-Free | Kami Studios",
    description:
      "Visualize and generate CSS border-radius values. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
