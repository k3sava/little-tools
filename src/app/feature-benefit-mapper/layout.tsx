import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

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
    images: [{ url: "https://tools.iamkesava.com/og/feature-benefit-mapper.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Feature Benefit Mapper | Free, Ad-Free | Kami Studios",
    description:
      "Map product features to customer benefits. Validate that every feature translates to real value. Export as Markdown, HTML, or CSV.",
    images: ["https://tools.iamkesava.com/og/feature-benefit-mapper.svg"]
  },
};

export default function FeatureBenefitMapperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"feature-benefit-mapper","name":"Feature-Benefit Mapper","description":"Map product features to customer benefits. Catch feature-speak before it reaches your landing page.","collection":"PMM","collectionHref":"/for/pmm"})} />
      {children}
    </>
  );
}
