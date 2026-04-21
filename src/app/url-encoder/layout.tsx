import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "URL Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode URLs, parse URL components, and inspect query parameters. No ads, no tracking.",
  },
};

export default function UrlEncoderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
