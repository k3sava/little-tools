import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
  description:
    "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/link-in-bio" },
  openGraph: {
    title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
    url: "https://tools.iamkesava.com/link-in-bio",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/link-in-bio.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/link-in-bio.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"link-in-bio","name":"Link-in-Bio Builder","description":"Create a link-in-bio page with custom links and themes.","collection":"Ads","collectionHref":"/for/ads"})} />
      {children}
    </>
  );
}
