import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JWT Decoder | Free, Ad-Free | Kami Studios",
  description:
    "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/jwt-decoder" },
  openGraph: {
    title: "JWT Decoder | Free, Ad-Free | Kami Studios",
    description:
      "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
    url: "https://tools.iamkesava.com/jwt-decoder",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JWT Decoder | Free, Ad-Free | Kami Studios",
    description:
      "Decode JSON Web Tokens instantly. Color-coded header, payload, and signature with expiration status. No ads, no tracking.",
  },
};

export default function JwtDecoderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
