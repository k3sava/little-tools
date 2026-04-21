import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
  description:
    "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/link-in-bio" },
  openGraph: {
    title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
    url: "https://tools.iamkesava.com/link-in-bio",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Link in Bio Builder | Free, Ad-Free | Kami Studios",
    description:
      "Create a link-in-bio page with custom links and themes. No ads, no tracking.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
