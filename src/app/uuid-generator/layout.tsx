import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "UUID / ULID Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate UUID v4 and ULID identifiers in bulk, validate format, and copy with one click. No ads, no tracking.",
  },
};

export default function UuidGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
