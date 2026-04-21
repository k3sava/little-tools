import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Invoice Generator | Free, No Signup | Kami Studios",
    description:
      "Create professional invoices with PDF export. No signup, no ads, no tracking. All processing happens in your browser.",
  },
};

export default function InvoiceGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
