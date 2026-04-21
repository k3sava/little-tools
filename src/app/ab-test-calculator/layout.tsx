import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "A/B Test Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Statistical significance calculator for A/B tests. Sample size planner and results analyzer. No signup required.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
