import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/markdown-editor.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown Editor | Free, Ad-Free | Kami Studios",
    description:
      "Write Markdown with live preview, GFM support, and export to HTML or PDF. Auto-saves locally. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/markdown-editor.svg"]
  },
};

export default function MarkdownEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"markdown-editor","name":"Markdown Editor","description":"Write and preview Markdown with live rendering and export.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
