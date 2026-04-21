import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favicon Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate favicons from text, emoji, or images. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/favicon" },
  openGraph: {
    title: "Favicon Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate favicons from text, emoji, or images. No ads, no tracking.",
    url: "https://tools.iamkesava.com/favicon",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Favicon Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate favicons from text, emoji, or images. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
