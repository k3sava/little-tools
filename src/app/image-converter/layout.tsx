import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Converter | Free, Ad-Free | Kami Studios",
  description:
    "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert - all client-side, no uploads.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/image-converter" },
  openGraph: {
    title: "Image Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert - all client-side, no uploads.",
    url: "https://tools.iamkesava.com/image-converter",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Image Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert - all client-side, no uploads.",
  },
};

export default function ImageConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
