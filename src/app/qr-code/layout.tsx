import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Code Generator | Free, Ad-Free | Kami Studios",
  description:
    "Generate QR codes with custom colors and sizes. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/qr-code" },
  openGraph: {
    title: "QR Code Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate QR codes with custom colors and sizes. No ads, no tracking.",
    url: "https://tools.iamkesava.com/qr-code",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "QR Code Generator | Free, Ad-Free | Kami Studios",
    description:
      "Generate QR codes with custom colors and sizes. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
