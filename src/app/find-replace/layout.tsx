import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/find-replace.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Find & Replace | Free, Ad-Free | Kami Studios",
    description:
      "Find and replace text with regex or plain text mode, case sensitivity toggle, and match count. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/find-replace.svg"]
  },
};

export default function FindReplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"find-replace","name":"Find & Replace","description":"Search and replace text with regex support and case sensitivity toggle.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
