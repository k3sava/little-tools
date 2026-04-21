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
    <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
      <Breadcrumb
        items={[
          { label: "home", href: "https://iamkesava.com" },
          { label: "apps", href: "https://apps.iamkesava.com" },
          { label: "tools", href: "/tools" },
          { label: collection.title.toLowerCase() },
        ]}
      />

      <div className="mx-auto w-[92%] max-w-[1600px] py-12 sm:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--kami-text)" }}>
            Tools for {collection.title}
          </h1>
          <p className="mt-3" style={{ color: "var(--kami-text-muted)" }}>
            {collection.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tools.map((tool) => (
            <AppCard
              key={tool.href}
              title={tool.name}
              description={tool.description}
              href={tool.href}
              badge={tool.icon}
              minHeight={172}
            />
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
