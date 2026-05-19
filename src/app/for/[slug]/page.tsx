import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allTools, collections } from "@/data/tools";
import { AppCard } from "@/components/app-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";
import { JsonLd, collectionLd } from "@/lib/json-ld";

interface Params { slug: string }

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.id }));
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await props.params;
  const col = collections.find((c) => c.id === slug);
  if (!col) return { title: "Collection not found" };
  const url = `https://tools.iamkesava.com${col.href}`;
  const title = `${col.title} tools | Free, Ad-Free | little tools`;
  const og = `https://tools.iamkesava.com/og/for-${col.id}.svg`;
  return {
    title,
    description: col.description,
    authors: [{ name: "Kesava" }],
    alternates: { canonical: url + "/" },
    openGraph: {
      title, description: col.description, url: url + "/",
      siteName: "little tools", type: "website",
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: col.description, images: [og] },
  };
}

export default async function CollectionPage(props: { params: Promise<Params> }) {
  const { slug } = await props.params;
  const col = collections.find((c) => c.id === slug);
  if (!col) notFound();
  const inCol = allTools.filter((t) => t.collections.includes(col.id));
  const others = collections.filter((c) => c.id !== col.id);

  return (
    <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
      <JsonLd
        data={collectionLd({
          id: col.id,
          title: col.title,
          description: col.description,
          tools: inCol.map((t) => ({ slug: t.href, name: t.name, description: t.description })),
        })}
      />

      <Breadcrumb
        items={[
          { label: "home", href: "https://apps.iamkesava.com" },
          { label: "tools", href: "/" },
          { label: col.title.toLowerCase() },
        ]}
      />

      <div
        className="mx-auto max-w-5xl px-6"
        style={{ paddingTop: "5rem", paddingBottom: "4rem" }}
      >
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: col.accentHex,
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <p
              className="text-xs uppercase tracking-widest font-mono"
              style={{ color: "var(--kami-text-dim)" }}
            >
              for {col.title.toLowerCase()}
            </p>
          </div>
          <h1
            className="font-display text-4xl font-semibold tracking-tight"
            style={{ color: "var(--kami-text)" }}
          >
            {col.title} tools
          </h1>
          <p
            className="mt-2 max-w-prose text-base"
            style={{ color: "var(--kami-text-muted)" }}
          >
            {col.description}
          </p>
          <p
            className="mt-2 text-xs font-mono"
            style={{ color: "var(--kami-text-dim)" }}
          >
            {inCol.length} tools · free, ad-free, processed in your browser
          </p>
        </header>

        {/* Tool grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inCol.map((t) => (
            <AppCard
              key={t.href}
              title={t.name}
              description={t.description}
              href={t.href}
              badge={t.icon}
              minHeight={128}
            />
          ))}
        </div>

        {/* Other collections */}
        <section className="mt-16 pt-8" style={{ borderTop: "1px solid var(--kami-border-strong)" }}>
          <p
            className="mb-3 text-xs uppercase tracking-widest font-mono"
            style={{ color: "var(--kami-text-dim)" }}
          >
            other collections
          </p>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <a
                key={c.id}
                href={c.href}
                className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full transition-colors"
                style={{
                  border: "1px solid var(--kami-border-strong)",
                  color: "var(--kami-text-muted)",
                  background: "var(--kami-surface-solid)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: c.accentHex,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                {c.title.toLowerCase()}
                <span style={{ color: "var(--kami-text-dim)" }}>
                  {allTools.filter((t) => t.collections.includes(c.id)).length}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
