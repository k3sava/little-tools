import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
  description:
    "Design CSS box shadows with visual controls. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/box-shadow" },
  openGraph: {
    title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
    description:
      "Design CSS box shadows with visual controls. No ads, no tracking.",
    url: "https://tools.iamkesava.com/box-shadow",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/box-shadow.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Box Shadow Generator | Free, Ad-Free | Kami Studios",
    description:
      "Design CSS box shadows with visual controls. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/box-shadow.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"box-shadow","name":"Box Shadow","description":"Design CSS box shadows with visual controls.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
