import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Keyframe Animator | Free, Ad-Free | Kami Studios",
    description:
      "Build CSS @keyframes animations visually with a timeline editor. Live preview and CSS export. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
