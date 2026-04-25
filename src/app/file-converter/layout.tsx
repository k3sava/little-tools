import type { Metadata } from "next";

const title = "File Converter | Free, Ad-Free | Kami Studios";
const description =
  "Convert images between PNG, JPG, WebP, and SVG. Resize, compress, and convert PDF pages to images. All client-side, no uploads.";
const url = "https://tools.iamkesava.com/file-converter";

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Kesava" }],
  alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "Kami Studios", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function FileConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
