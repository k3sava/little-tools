import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Release Notes Formatter | Free, Ad-Free | Kami Studios",
    description:
      "Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or copy-paste-ready text. No signup required.",
  },
};

export default function ReleaseNotesFormatterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
