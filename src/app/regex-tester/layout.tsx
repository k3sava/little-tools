import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Regex Tester | Free, Ad-Free | Kami Studios",
  description:
    "Test regular expressions with real-time match highlighting, capture groups, and a common patterns reference. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/regex-tester" },
  openGraph: {
    title: "Regex Tester | Free, Ad-Free | Kami Studios",
    description:
      "Test regular expressions with real-time match highlighting, capture groups, and a common patterns reference. No ads, no tracking.",
    url: "https://tools.iamkesava.com/regex-tester",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/regex-tester.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Tester | Free, Ad-Free | Kami Studios",
    description:
      "Test regular expressions with real-time match highlighting, capture groups, and a common patterns reference. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/regex-tester.svg"]
  },
};

export default function RegexTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"regex-tester","name":"Regex Tester","description":"Test regex patterns with real-time match highlighting.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
