import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "UUID / ULID Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate UUID v4 and ULID identifiers in bulk, validate format, and copy with one click. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/uuid-generator",
  },
  openGraph: {
    title: "UUID / ULID Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate UUID v4 and ULID identifiers in bulk, validate format, and copy with one click. No ads, no tracking.",
    url: "https://tools.iamkesava.com/uuid-generator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/uuid-generator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID / ULID Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate UUID v4 and ULID identifiers in bulk, validate format, and copy with one click. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/uuid-generator.svg"]
  },
};

export default function UuidGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"uuid-generator","name":"UUID / ULID Generator","description":"Generate UUID v4 and ULID identifiers in bulk.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
