import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UTM Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build campaign URLs with UTM parameters, platform presets, and bulk generation. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/utm-builder" },
  openGraph: {
    title: "UTM Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build campaign URLs with UTM parameters, platform presets, and bulk generation. No ads, no tracking.",
    url: "https://tools.iamkesava.com/utm-builder",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "UTM Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build campaign URLs with UTM parameters, platform presets, and bulk generation. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
