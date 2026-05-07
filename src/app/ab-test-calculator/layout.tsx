import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "A/B Test Calculator | Free, Ad-Free | Kami Studios",
  description:
    "Statistical significance calculator for A/B tests. Sample size planner and results analyzer. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/ab-test-calculator",
  },
  openGraph: {
    title: "A/B Test Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Statistical significance calculator for A/B tests. Sample size planner and results analyzer. No signup required.",
    url: "https://tools.iamkesava.com/ab-test-calculator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/ab-test-calculator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "A/B Test Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Statistical significance calculator for A/B tests. Sample size planner and results analyzer. No signup required.",
    images: ["https://tools.iamkesava.com/og/ab-test-calculator.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"ab-test-calculator","name":"A/B Test Calculator","description":"Statistical significance calculator for A/B tests. Sample size planner and results analyzer.","collection":"PMM","collectionHref":"/for/pmm"})} />
      {children}
    </>
  );
}
