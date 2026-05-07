import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Case Converter | Free, Ad-Free | Kami Studios",
  description:
    "Convert text between camelCase, snake_case, kebab-case, PascalCase, UPPER CASE, lower case, Sentence case, and dot.case. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/case-converter" },
  openGraph: {
    title: "Case Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert text between camelCase, snake_case, kebab-case, PascalCase, UPPER CASE, lower case, Sentence case, and dot.case. No ads, no tracking.",
    url: "https://tools.iamkesava.com/case-converter",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/case-converter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Case Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert text between camelCase, snake_case, kebab-case, PascalCase, UPPER CASE, lower case, Sentence case, and dot.case. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/case-converter.svg"]
  },
};

export default function CaseConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"case-converter","name":"Case Converter","description":"Convert text between Title Case, camelCase, snake_case, kebab-case, PascalCase, and more.","collection":"Writers","collectionHref":"/for/writers"})} />
      {children}
    </>
  );
}
