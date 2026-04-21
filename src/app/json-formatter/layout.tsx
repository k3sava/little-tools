import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JSON Formatter & Validator | Free, Ad-Free | Kami Studios",
  description:
    "Format, beautify, minify, and validate JSON with adjustable indentation and a collapsible tree view. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/json-formatter" },
  openGraph: {
    title: "JSON Formatter & Validator | Free, Ad-Free | Kami Studios",
    description:
      "Format, beautify, minify, and validate JSON with adjustable indentation and a collapsible tree view. No ads, no tracking.",
    url: "https://tools.iamkesava.com/json-formatter",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JSON Formatter & Validator | Free, Ad-Free | Kami Studios",
    description:
      "Format, beautify, minify, and validate JSON with adjustable indentation and a collapsible tree view. No ads, no tracking.",
  },
};

export default function JsonFormatterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
