import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markdown Editor | Free, Ad-Free | Kami Studios",
  description:
    "Write Markdown with live preview, GFM support, and export to HTML or PDF. Auto-saves locally. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/markdown-editor" },
  openGraph: {
    title: "Markdown Editor | Free, Ad-Free | Kami Studios",
    description:
      "Write Markdown with live preview, GFM support, and export to HTML or PDF. Auto-saves locally. No ads, no tracking.",
    url: "https://tools.iamkesava.com/markdown-editor",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Markdown Editor | Free, Ad-Free | Kami Studios",
    description:
      "Write Markdown with live preview, GFM support, and export to HTML or PDF. Auto-saves locally. No ads, no tracking.",
  },
};

export default function MarkdownEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
