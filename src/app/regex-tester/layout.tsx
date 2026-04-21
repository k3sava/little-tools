import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Regex Tester | Free, Ad-Free | Kami Studios",
    description:
      "Test regular expressions with real-time match highlighting, capture groups, and a common patterns reference. No ads, no tracking.",
  },
};

export default function RegexTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
