import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Keyframe Animator | Free, Ad-Free | Kami Studios",
  description:
    "Build CSS @keyframes animations visually with a timeline editor. Live preview and CSS export. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: {
    canonical: "https://tools.iamkesava.com/keyframe-animator",
  },
  openGraph: {
    title: "Keyframe Animator | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS @keyframes animations visually with a timeline editor. Live preview and CSS export. No ads, no tracking.",
    url: "https://tools.iamkesava.com/keyframe-animator",
    siteName: "Kami Studios",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/keyframe-animator.svg", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Keyframe Animator | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS @keyframes animations visually with a timeline editor. Live preview and CSS export. No ads, no tracking.",
    images: ["https://tools.iamkesava.com/og/keyframe-animator.svg"]
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={softwareLd({"slug":"keyframe-animator","name":"Keyframe Animator","description":"Build CSS @keyframes animations visually with timeline editor.","collection":"Designers","collectionHref":"/for/designers"})} />
      {children}
    </>
  );
}
