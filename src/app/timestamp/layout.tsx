import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/timestamp.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Unix Timestamp Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert Unix timestamps to human dates and back. Live clock, timezone support, relative time. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/timestamp.svg"]
  },
};

export default function TimestampLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"timestamp","name":"Timestamp Converter","description":"Convert between Unix timestamps and dates.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
