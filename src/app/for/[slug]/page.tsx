import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { allTools, collections } from "@/data/tools";
import { JsonLd, collectionLd } from "@/lib/json-ld";

interface Params { slug: string }

// One static page per collection. Required for `output: "export"`.
export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.id }));
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await props.params;
  const col = collections.find((c) => c.id === slug);
  if (!col) return { title: "Collection not found" };
  const url = `https://tools.iamkesava.com${col.href}`;
  const title = `${col.title} tools | Free, Ad-Free | Kami Studios`;
  const description = col.description;
  const og = `https://tools.iamkesava.com/og/for-${col.id}.svg`;
  return {
    title,
    description,
    authors: [{ name: "Kesava" }],
    alternates: { canonical: url + "/" },
    openGraph: {
      title,
      description,
      url: url + "/",
      siteName: "little tools",
      type: "website",
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function CollectionPage(props: { params: Promise<Params> }) {
  const { slug } = await props.params;
  const col = collections.find((c) => c.id === slug);
  if (!col) notFound();
  const inCol = allTools.filter((t) => t.collections.includes(col.id));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <JsonLd
        data={collectionLd({
          id: col.id,
          title: col.title,
          description: col.description,
          tools: inCol.map((t) => ({
            slug: t.href,
            name: t.name,
            description: t.description,
          })),
        })}
      />
      <nav className="mb-6 font-mono text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">little tools</Link>
        <span className="mx-2">·</span>
        <span>{col.title.toLowerCase()}</span>
      </nav>
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">for {col.title.toLowerCase()}</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight">
          {col.title} tools
        </h1>
        <p className="mt-3 max-w-prose text-lg text-neutral-600">{col.description}</p>
        <p className="mt-2 font-mono text-xs text-neutral-500">{inCol.length} tools · all free, ad-free, processed in your browser</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {inCol.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-lg border border-neutral-200 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-white"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-neutral-400 group-hover:text-neutral-700">{t.icon}</span>
              <h3 className="font-medium text-neutral-900">{t.name}</h3>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{t.description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-16 border-t border-neutral-200 pt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500">other collections</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {collections
            .filter((c) => c.id !== col.id)
            .map((c) => (
              <Link
                key={c.id}
                href={c.href}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 font-mono text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
              >
                {c.title.toLowerCase()}
                <span className="text-neutral-400">{allTools.filter((t) => t.collections.includes(c.id)).length}</span>
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
