import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
  description:
    "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/base64" },
  openGraph: {
    title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
    url: "https://tools.iamkesava.com/base64",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/base64.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/base64.svg"]
  },
};

export default function Base64Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"base64","name":"Base64 Encode/Decode","description":"Encode and decode Base64 text and files.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
