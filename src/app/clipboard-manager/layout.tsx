import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Clipboard Manager | Free, Ad-Free | Kami Studios",
    description:
      "Save, search, pin, and copy text clips. Lightweight clipboard history that lives in your browser. No ads, no tracking, no backend.",
  },
};

export default function ClipboardManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
