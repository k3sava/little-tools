import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OG Image Generator | Free, Ad-Free | Kami Studios",
  description:
    "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/og-image" },
  openGraph: {
    title: "OG Image Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
    url: "https://tools.iamkesava.com/og-image",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OG Image Generator | Free, Ad-Free | Kami Studios",
    description:
      "Create Open Graph social cards with a visual editor. 8 templates, multi-platform preview, PNG/JPEG export, and OG tag validator. All client-side.",
  },
};

export default function OgImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
