import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Video Converter | Free, Ad-Free | Kami Studios",
  description:
    "Convert videos between WebM, MP4, and more. 100% client-side using WebCodecs. No uploads, no file size limits, no watermarks.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/video-converter" },
  openGraph: {
    title: "Video Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert videos between WebM, MP4, and more. 100% client-side using WebCodecs. No uploads, no file size limits, no watermarks.",
    url: "https://tools.iamkesava.com/video-converter",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/video-converter.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Video Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert videos between WebM, MP4, and more. 100% client-side using WebCodecs. No uploads, no file size limits, no watermarks.",
    images: ["https://tools.iamkesava.com/og/video-converter.svg"]
  },
};

export default function VideoConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"video-converter","name":"Video Converter","description":"Convert videos between MP4 and WebM. 100% client-side, no uploads, no limits.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
