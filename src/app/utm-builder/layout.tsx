import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/utm-builder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "UTM Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build campaign URLs with UTM parameters, platform presets, and bulk generation. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/utm-builder.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"utm-builder","name":"UTM Builder","description":"Build campaign URLs with UTM parameters, presets, and bulk generation.","collection":"SEO","collectionHref":"/for/seo"})} />
      {children}
    </>
  );
}
