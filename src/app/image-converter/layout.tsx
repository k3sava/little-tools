import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/image-converter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Image Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert - all client-side, no uploads.",
    images: ["https://tools.iamkesava.com/og/image-converter.svg"]
  },
};

export default function ImageConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"image-converter","name":"Image Converter","description":"Convert images between formats in your browser.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
