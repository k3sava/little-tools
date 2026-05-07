import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "JWT Decoder | Free, Ad-Free | Kami Studios",
  description:
    "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/jwt-decoder" },
  openGraph: {
    title: "JWT Decoder | Free, Ad-Free | Kami Studios",
    description:
      "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
    url: "https://tools.iamkesava.com/jwt-decoder",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/jwt-decoder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Decoder | Free, Ad-Free | Kami Studios",
    description:
      "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/jwt-decoder.svg"]
  },
};

export default function JwtDecoderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"jwt-decoder","name":"JWT Decoder","description":"Decode JSON Web Tokens with color-coded output.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
