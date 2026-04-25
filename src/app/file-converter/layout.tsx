import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File Converter - Free, Ad-Free | Kami Tools",
  description:
    "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert PDF pages to images. All client-side, no uploads.",
};

export default function FileConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
