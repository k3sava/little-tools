import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Color Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert colors between HEX, RGB, HSL, HSB/HSV, and CMYK. Color picker, contrast checker, and palette generator. No ads, no tracking.",
  },
};

export default function ColorConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
