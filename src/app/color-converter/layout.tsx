import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Color Converter | Free, Ad-Free | Kami Studios",
  description:
    "Convert colors between HEX, RGB, HSL, HSB/HSV, and CMYK. Color picker, contrast checker, and palette generator. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/color-converter" },
  openGraph: {
    title: "Color Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert colors between HEX, RGB, HSL, HSB/HSV, and CMYK. Color picker, contrast checker, and palette generator. No ads, no tracking.",
    url: "https://tools.iamkesava.com/color-converter",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/color-converter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert colors between HEX, RGB, HSL, HSB/HSV, and CMYK. Color picker, contrast checker, and palette generator. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/color-converter.svg"]
  },
};

export default function ColorConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"color-converter","name":"Color Converter","description":"Convert between HEX, RGB, HSL, and other color formats.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
