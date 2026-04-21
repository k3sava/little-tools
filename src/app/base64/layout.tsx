import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
  description:
    "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/base64" },
  openGraph: {
    title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
    url: "https://tools.iamkesava.com/base64",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Base64 Encode/Decode | Free, Ad-Free | Kami Studios",
    description:
      "Encode and decode Base64 text and files with drag-and-drop support. No ads, no tracking.",
  },
};

export default function Base64Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
