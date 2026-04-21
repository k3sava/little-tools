import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/glassmorphism" },
  openGraph: {
    title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
    url: "https://tools.iamkesava.com/glassmorphism",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Glassmorphism Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate glass and soft-UI effects with CSS output. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
