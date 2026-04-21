import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find & Replace | Free, Ad-Free | Kami Studios",
  description:
    "Find and replace text with regex or plain text mode, case sensitivity toggle, and match count. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/find-replace" },
  openGraph: {
    title: "Find & Replace | Free, Ad-Free | Kami Studios",
    description:
      "Find and replace text with regex or plain text mode, case sensitivity toggle, and match count. No ads, no tracking.",
    url: "https://tools.iamkesava.com/find-replace",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Find & Replace | Free, Ad-Free | Kami Studios",
    description:
      "Find and replace text with regex or plain text mode, case sensitivity toggle, and match count. No ads, no tracking.",
  },
};

export default function FindReplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
