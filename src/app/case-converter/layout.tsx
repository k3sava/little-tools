import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Case Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert text between camelCase, snake_case, kebab-case, PascalCase, UPPER CASE, lower case, Sentence case, and dot.case. No ads, no tracking.",
  },
};

export default function CaseConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
