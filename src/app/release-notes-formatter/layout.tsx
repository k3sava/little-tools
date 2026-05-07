import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Release Notes Formatter | Free, Ad-Free | Kami Studios",
  description:
    "Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or copy-paste-ready text. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/release-notes-formatter" },
  openGraph: {
    title: "Release Notes Formatter | Free, Ad-Free | Kami Studios",
    description:
      "Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or copy-paste-ready text. No signup required.",
    url: "https://tools.iamkesava.com/release-notes-formatter",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/release-notes-formatter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Release Notes Formatter | Free, Ad-Free | Kami Studios",
    description:
      "Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or copy-paste-ready text. No signup required.",
    images: ["https://tools.iamkesava.com/og/release-notes-formatter.svg"]
  },
};

export default function ReleaseNotesFormatterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"release-notes-formatter","name":"Release Notes Formatter","description":"Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or plain text.","collection":"PM","collectionHref":"/for/pm"})} />
      {children}
    </>
  );
}
