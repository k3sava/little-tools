import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Passage Audit | Free, Ad-Free | Kami Studios",
  description:
    "Score every passage on your page for AI retrievability. Catches thin headings, hero copy, and button labels that disappear when an AI chunks the page. Inspired by Mike King's relevance engineering.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com/passage-audit" },
  openGraph: {
    title: "Passage Audit | Free, Ad-Free | Kami Studios",
    description:
      "Score every passage on your page for AI retrievability. Catches thin copy that disappears when an AI chunks the page.",
    url: "https://tools.iamkesava.com/passage-audit",
    siteName: "Kami Studios",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Passage Audit | Free, Ad-Free | Kami Studios",
    description:
      "Score every passage on your page for AI retrievability. Catches thin copy that disappears when an AI chunks the page.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareLd({
          slug: "passage-audit",
          name: "Passage Audit",
          description:
            "Score every passage on your page for AI retrievability. Catches thin copy that disappears when an AI chunks the page.",
          collection: "SEO",
          collectionHref: "/for/seo",
        })}
      />
      {children}
    </>
  );
}
