// JsonLd — small helper for emitting Schema.org structured data inside a
// Next.js layout. Static-export friendly. Each call renders one
// <script type="application/ld+json"> tag.

import type { ReactNode } from "react";

export const SITE = "https://tools.iamkesava.com";
export const REPO = "https://github.com/k3sava/little-tools";

// Canonical Person + Organization referenced by every page on every site.
// Beefed up with sameAs (LinkedIn, GitHub), jobTitle, knowsAbout. Identical
// shape across tools / apps / toys / ab-codex so AI agents recognise this
// is the same author across all four.
export const PERSON_KESAVA = {
  "@type": "Person",
  "@id": "https://iamkesava.com/#kesava",
  name: "Kesava",
  givenName: "Kesava",
  alternateName: "Kesava Mandiga",
  url: "https://iamkesava.com/",
  jobTitle: "Product marketing operator and indie builder",
  knowsAbout: [
    "Product marketing",
    "Go-to-market",
    "AI-native product design",
    "Web tools and utilities",
    "Generative art",
    "CSS",
    "Open source",
  ],
  sameAs: [
    "https://github.com/k3sava",
    "https://www.linkedin.com/in/k3sava",
    "https://apps.iamkesava.com/",
    "https://tools.iamkesava.com/",
    "https://toys.iamkesava.com/",
    "https://codex.iamkesava.com/",
  ],
};

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
      // Boilerplate FAQ that applies to every tool. AI search agents pull
      // this for "is it free?", "do you upload my data?" type queries.
      {
        "@type": "FAQPage",
        "@id": url + "#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: `What is ${name}?`,
            acceptedAnswer: { "@type": "Answer", text: description },
          },
          {
            "@type": "Question",
            name: `Is ${name} free?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Free, no signup, no ads, no data collection. Runs entirely in your browser.",
            },
          },
          {
            "@type": "Question",
            name: `Does ${name} upload my data?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. All processing happens client-side in your browser. Nothing is uploaded to a server.",
            },
          },
          {
            "@type": "Question",
            name: `Who built ${name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Kesava (https://iamkesava.com), part of the Kami Studios little tools collection at https://tools.iamkesava.com.",
            },
          },
        ],
      },
      // Speakable selectors mark which page elements an AI assistant should
      // read aloud. h1 + the first paragraph after it cover the claim+context
      // every tool page renders.
      {
        "@type": "WebPage",
        "@id": url + "#page",
        url,
        name,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", "main p:first-of-type"],
        },
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
        sameAs: [
          "https://apps.iamkesava.com/",
          "https://toys.iamkesava.com/",
          "https://codex.iamkesava.com/",
          "https://iamkesava.com/",
        ],
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
