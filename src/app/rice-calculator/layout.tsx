import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
  description:
    "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/rice-calculator" },
  openGraph: {
    title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
    url: "https://tools.iamkesava.com/rice-calculator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/rice-calculator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "RICE Scoring Calculator | Free, Ad-Free | Kami Studios",
    description:
      "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort. No signup required.",
    images: ["https://tools.iamkesava.com/og/rice-calculator.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"rice-calculator","name":"RICE Scoring Calculator","description":"Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort.","collection":"PM","collectionHref":"/for/pm"})} />
      {children}
    </>
  );
}
