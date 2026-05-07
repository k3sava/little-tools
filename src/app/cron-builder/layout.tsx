import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Cron Expression Builder | Free, Ad-Free | Kami Studios",
  description:
    "Build and decode cron expressions visually. See next execution times and human-readable descriptions. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/cron-builder" },
  openGraph: {
    title: "Cron Expression Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build and decode cron expressions visually. See next execution times and human-readable descriptions. No ads, no tracking.",
    url: "https://tools.iamkesava.com/cron-builder",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/cron-builder.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build and decode cron expressions visually. See next execution times and human-readable descriptions. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/cron-builder.svg"]
  },
};

export default function CronBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"cron-builder","name":"Cron Builder","description":"Build and validate cron expressions visually.","collection":"Developers","collectionHref":"/for/developers"})} />
      {children}
    </>
  );
}
