import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Cron Expression Builder | Free, Ad-Free | Kami Studios",
    description:
      "Build and decode cron expressions visually. See next execution times and human-readable descriptions. No ads, no tracking.",
  },
};

export default function CronBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
