import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Invoice Generator | Free, No Signup | Kami Studios",
  description:
    "Create professional invoices with PDF export. No signup, no ads, no tracking. All processing happens in your browser.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/invoice-generator" },
  openGraph: {
    title: "Invoice Generator | Free, No Signup | Kami Studios",
    description:
      "Create professional invoices with PDF export. No signup, no ads, no tracking. All processing happens in your browser.",
    url: "https://tools.iamkesava.com/invoice-generator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/invoice-generator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Generator | Free, No Signup | Kami Studios",
    description:
      "Create professional invoices with PDF export. No signup, no ads, no tracking. All processing happens in your browser.",
    images: ["https://tools.iamkesava.com/og/invoice-generator.svg"]
  },
};

export default function InvoiceGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"invoice-generator","name":"Invoice Generator","description":"Create professional invoices with PDF export and local storage.","collection":"Everyone","collectionHref":"/for/everyone"})} />
      {children}
    </>
  );
}
