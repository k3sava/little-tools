import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scroll Animation | Free, Ad-Free | Kami Studios",
  description:
    "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/scroll-animation",
  },
  openGraph: {
    title: "Scroll Animation | Free, Ad-Free | Kami Studios",
    description:
      "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
    url: "https://tools.iamkesava.com/scroll-animation",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Scroll Animation | Free, Ad-Free | Kami Studios",
    description:
      "Generate scroll-driven CSS animations with live preview. No JavaScript required. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
