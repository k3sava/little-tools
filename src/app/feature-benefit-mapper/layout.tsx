import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feature Benefit Mapper | Free, Ad-Free | Kami Studios",
  description:
    "Map product features to customer benefits. Validate that every feature translates to real value. Export as Markdown, HTML, or CSV. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/feature-benefit-mapper" },
  openGraph: {
    title: "Feature Benefit Mapper | Free, Ad-Free | Kami Studios",
    description:
      "Map product features to customer benefits. Validate that every feature translates to real value. Export as Markdown, HTML, or CSV.",
    url: "https://tools.iamkesava.com/feature-benefit-mapper",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Feature Benefit Mapper | Free, Ad-Free | Kami Studios",
    description:
      "Map product features to customer benefits. Validate that every feature translates to real value. Export as Markdown, HTML, or CSV.",
  },
};

export default function FeatureBenefitMapperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
