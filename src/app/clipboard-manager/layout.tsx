import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Clipboard Manager | Free, Ad-Free | Kami Studios",
  description:
    "Save, search, pin, and copy text clips. Lightweight clipboard history that lives in your browser. No ads, no tracking, no backend.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/clipboard-manager" },
  openGraph: {
    title: "Clipboard Manager | Free, Ad-Free | Kami Studios",
    description:
      "Save, search, pin, and copy text clips. Lightweight clipboard history that lives in your browser. No ads, no tracking, no backend.",
    url: "https://tools.iamkesava.com/clipboard-manager",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/clipboard-manager.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Clipboard Manager | Free, Ad-Free | Kami Studios",
    description:
      "Save, search, pin, and copy text clips. Lightweight clipboard history that lives in your browser. No ads, no tracking, no backend.",
    images: ["https://tools.iamkesava.com/og/clipboard-manager.svg"]
  },
};

export default function ClipboardManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"clipboard-manager","name":"Clipboard Manager","description":"Save, search, and organize text clips in your browser.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
