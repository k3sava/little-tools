import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "AEO Readiness Scorer | Free, Ad-Free | Kami Studios",
  description:
    "Score any web page on twelve structural signals AI search engines use to decide what to cite. Offline Python script, no API keys. Inspired by Aleyda Solis's Readiness framework.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/aeo-readiness-scorer" },
  openGraph: {
    title: "AEO Readiness Scorer | Free, Ad-Free | Kami Studios",
    description:
      "Score any web page on twelve structural signals AI search engines use to decide what to cite. Offline Python script, no API keys.",
    url: "https://tools.iamkesava.com/aeo-readiness-scorer",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AEO Readiness Scorer | Free, Ad-Free | Kami Studios",
    description:
      "Score any web page on twelve structural signals AI search engines use to decide what to cite. Offline Python script, no API keys.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareLd({
          slug: "aeo-readiness-scorer",
          name: "AEO Readiness Scorer",
          description:
            "Score any web page on twelve structural signals AI search engines use to decide what to cite.",
          collection: "SEO",
          collectionHref: "/for/seo",
        })}
      />
      {children}
    </>
  );
}
