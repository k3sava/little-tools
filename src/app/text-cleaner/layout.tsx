import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Text Cleaner | Free, Ad-Free | Kami Studios",
  description:
    "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/text-cleaner" },
  openGraph: {
    title: "Text Cleaner | Free, Ad-Free | Kami Studios",
    description:
      "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
    url: "https://tools.iamkesava.com/text-cleaner",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Text Cleaner | Free, Ad-Free | Kami Studios",
    description:
      "Clean up messy text: remove extra whitespace, line breaks, special characters, duplicate lines, and more. No ads, no tracking.",
  },
};

export default function TextCleanerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
