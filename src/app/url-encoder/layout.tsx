import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "URL Encode/Decode | Free, Ad-Free | Kami Studios",
  description:
    "Encode and decode URLs, parse URL components, and inspect query parameters. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/url-encoder" },
  openGraph: {
    title: "URL Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode URLs, parse URL components, and inspect query parameters. No ads, no tracking.",
    url: "https://tools.iamkesava.com/url-encoder",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/url-encoder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode URLs, parse URL components, and inspect query parameters. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/url-encoder.svg"]
  },
};

export default function UrlEncoderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"url-encoder","name":"URL Encode/Decode","description":"Encode and decode URLs, parse query parameters.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
