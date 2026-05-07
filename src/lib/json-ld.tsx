// JsonLd — small helper for emitting Schema.org structured data inside a
// Next.js layout. Static-export friendly. Each call renders one
// <script type="application/ld+json"> tag.

import type { ReactNode } from "react";

export const SITE = "https://tools.iamkesava.com";

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ── per-tool SoftwareApplication + BreadcrumbList @graph ────────────────────
// Returns an @graph the page can render with <JsonLd data={softwareLd(...)} />.
// Pulls the tool's name + description + collection from the tools manifest at
// build time. Falls back to args if the slug isn't in the manifest yet.

export interface SoftwareLdInput {
  slug: string;            // canonical path segment, e.g. "ab-test-calculator"
  name: string;            // display title
  description: string;     // 1-line value prop
  collection?: string;     // primary collection title (e.g. "Developers")
  collectionHref?: string; // e.g. "/for/developers"
}

export function softwareLd({ slug, name, description, collection, collectionHref }: SoftwareLdInput) {
  const url = `${SITE}/${slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": url + "#app",
        name,
        description,
        url,
        applicationCategory: "WebApplication",
        applicationSubCategory: collection || "Utility",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. All processing client-side.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@type": "Person", name: "Kesava", url: "https://iamkesava.com" },
        publisher: { "@type": "Organization", name: "little tools", url: SITE },
        image: `${SITE}/og/${slug}.svg`,
        license: "https://opensource.org/licenses/MIT",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "little tools", item: SITE + "/" },
          ...(collection && collectionHref
            ? [{ "@type": "ListItem", position: 2, name: collection, item: SITE + collectionHref + "/" }]
            : []),
          { "@type": "ListItem", position: collection ? 3 : 2, name, item: url },
        ],
      },
    ],
  };
}

// ── collection (FAQPage-style index) ────────────────────────────────────────
export interface CollectionLdInput {
  id: string; // e.g. "developers"
  title: string;
  description: string;
  tools: { slug: string; name: string; description: string }[];
}

export function collectionLd({ id, title, description, tools }: CollectionLdInput) {
  const url = `${SITE}/for/${id}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        name: `${title} tools`,
        description,
        url,
        publisher: { "@type": "Organization", name: "little tools", url: SITE },
        hasPart: tools.slice(0, 30).map((t) => ({
          "@type": "SoftwareApplication",
          name: t.name,
          description: t.description,
          url: `${SITE}/${t.slug.replace(/^\//, "").replace(/\/$/, "")}/`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "little tools", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: title, item: url },
        ],
      },
    ],
  };
}

// ── root WebSite + Organization (one-time, root layout) ─────────────────────
export function rootLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": SITE + "/#site",
        name: "little tools",
        alternateName: "Kami Studios little tools",
        url: SITE + "/",
        publisher: { "@id": SITE + "/#org" },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE}/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": SITE + "/#org",
        name: "Kami Studios",
        url: "https://iamkesava.com",
        founder: { "@type": "Person", name: "Kesava", url: "https://iamkesava.com" },
        sameAs: ["https://github.com/k3sava", "https://www.linkedin.com/in/k3sava"],
      },
    ],
  };
}

// ── small placeholder so this is valid as a JSX module too ──────────────────
export function JsonLdRoot({ children }: { children?: ReactNode }) {
  return (
    <>
      <JsonLd data={rootLd()} />
      {children}
    </>
  );
}
