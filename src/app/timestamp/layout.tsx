import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unix Timestamp Converter | Free, Ad-Free | Kami Studios",
  description:
    "Convert Unix timestamps to human dates and back. Live clock, timezone support, relative time. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/timestamp" },
  openGraph: {
    title: "Unix Timestamp Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert Unix timestamps to human dates and back. Live clock, timezone support, relative time. No ads, no tracking.",
    url: "https://tools.iamkesava.com/timestamp",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Unix Timestamp Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert Unix timestamps to human dates and back. Live clock, timezone support, relative time. No ads, no tracking.",
  },
};

export default function TimestampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
