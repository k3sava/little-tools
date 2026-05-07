import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Easing Editor | Free, Ad-Free | Kami Studios",
  description:
    "Design cubic-bezier, spring, and linear() CSS easing curves with visual editor and live preview. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/easing-editor" },
  openGraph: {
    title: "Easing Editor | Free, Ad-Free | Kami Studios",
    description:
      "Design cubic-bezier, spring, and linear() CSS easing curves with visual editor and live preview. No ads, no tracking.",
    url: "https://tools.iamkesava.com/easing-editor",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/easing-editor.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Easing Editor | Free, Ad-Free | Kami Studios",
    description:
      "Design cubic-bezier, spring, and linear() CSS easing curves with visual editor and live preview. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/easing-editor.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"easing-editor","name":"Easing Editor","description":"Design cubic-bezier, spring, and linear() easing curves.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
