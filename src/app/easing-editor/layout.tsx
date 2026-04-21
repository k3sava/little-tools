import type { Metadata } from "next";

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
  },
  twitter: {
    card: "summary",
    title: "Easing Editor | Free, Ad-Free | Kami Studios",
    description:
      "Design cubic-bezier, spring, and linear() CSS easing curves with visual editor and live preview. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
