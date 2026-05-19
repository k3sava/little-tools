"use client";

import { AppCard } from "@/components/app-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";
import type { CollectionMeta, Tool } from "@/data/tools";

interface CollectionPageProps {
  collection: CollectionMeta;
  tools: Tool[];
}

export function CollectionPage({ collection, tools }: CollectionPageProps) {
  return (
    <div
      className="kami-scope min-h-screen tools-hub"
      style={{ color: "var(--kami-text)" }}
    >
      <Breadcrumb
        items={[
          { label: "home", href: "https://apps.iamkesava.com" },
          { label: "tools", href: "/" },
          { label: collection.title.toLowerCase() },
        ]}
      />

      <main
        id="main"
        className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8"
      >
        <div className="mb-6 flex items-start gap-3 sm:mb-8">
          <span
            aria-hidden="true"
            className="mt-2 inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: collection.accentHex }}
          />
          <div>
            <h1
              className="text-2xl font-semibold leading-tight sm:text-3xl"
              style={{ color: "var(--kami-text)" }}
            >
              Tools for {collection.title}
            </h1>
            <p
              className="mt-1 text-sm sm:text-base"
              style={{ color: "var(--kami-text-muted)" }}
            >
              {collection.description}
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
              {tools.length} tool{tools.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="tools-hub-grid">
          {tools.map((tool) => (
            <AppCard
              key={tool.href}
              title={tool.name}
              description={tool.description}
              href={tool.href}
              badge={tool.icon}
              minHeight={160}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
