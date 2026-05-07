import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "QR Code Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate QR codes with custom colors and sizes. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/qr-code" },
  openGraph: {
    title: "QR Code Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate QR codes with custom colors and sizes. No ads, no tracking.",
    url: "https://tools.iamkesava.com/qr-code",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/qr-code.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate QR codes with custom colors and sizes. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/qr-code.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"qr-code","name":"QR Code Generator","description":"Generate QR codes with custom colors and sizes.","collection":"Ads","collectionHref":"/for/ads"})} />
      {children}
    </>
  );
}
