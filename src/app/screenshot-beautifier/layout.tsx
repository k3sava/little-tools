import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
  description:
    "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/screenshot-beautifier",
  },
  openGraph: {
    title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
    description:
      "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
    url: "https://tools.iamkesava.com/screenshot-beautifier",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Screenshot Beautifier | Free, Ad-Free | Kami Studios",
    description:
      "Add backgrounds, shadows, and frames to screenshots. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
