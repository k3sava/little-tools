import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Video Converter | Free, Ad-Free | Kami Studios",
    description:
      "Convert videos between WebM, MP4, and more. 100% client-side using WebCodecs. No uploads, no file size limits, no watermarks.",
  },
};

export default function VideoConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
